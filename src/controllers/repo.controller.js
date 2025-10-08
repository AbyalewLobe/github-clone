import Repository from "../models/Repository.js";
import User from "../models/User.js";
import Branch from "../models/Branch.js";
import Commit from "../models/Commit.js";
import PullRequest from "../models/PullRequest.js";
import Issue from "../models/Issue.js";
import RepoCollaborator from "../models/RepoCollaborator.js";
import AppError from "../utils/appError.js";
import { successResponse } from "../utils/response.js";

// Create a new repository
export const createRepository = async (req, res, next) => {
  try {
    let { name, description, visibility } = req.body;

    if (!name?.trim()) {
      return next(new AppError("Repository name is required", 400));
    }

    const owner = req.user._id;
    name = name.trim().toLowerCase().replace(/\s+/g, "-");

    const newRepo = new Repository({
      name,
      description,
      visibility,
      owner,
    });
    await newRepo.save();

    const defaultBranch = new Branch({
      repo: newRepo._id,
      name: "main",
      protected: true,
    });
    await defaultBranch.save();

    newRepo.defaultBranch = defaultBranch.name;
    await newRepo.save();

    return successResponse(res, 201, {
      message: "Repository created successfully with default 'main' branch",
      repository: newRepo,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(
        new AppError("Repository with this name already exists", 400)
      );
    }
    return next(error);
  }
};
//List repository
export const listRepository = async (req, res, next) => {
  try {
    const {
      owner,
      q,
      visibility,
      sort = "-createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};
    if (owner) {
      const user = await User.findOne({ username: owner });
      if (!user) return next(new AppError("Owner not found", 404));
      filter.owner = user._id;
    }
    if (!req.user) {
      filter.visibility = "public";
    } else if (visibility) {
      filter.visibility = visibility;
    }
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const repos = await Repository.find(filter)
      .populate("owner", "username avatarUrl name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Repository.countDocuments(filter);

    return successResponse(res, 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: repos.length,
      repos,
    });
  } catch (error) {
    return next(error);
  }
};

export const getUserRepository = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const user = await User.findOne({ username: owner });
    if (!user) {
      return next(new AppError("Owner not found", 404));
    }

    const repository = await Repository.findOne({
      owner: user._id,
      $or: [{ name: repo.toLowerCase() }, { _id: repo }],
    })
      .populate("owner", "username name avatarUrl")
      .populate("forkFrom", "name owner");

    if (!repository) {
      return next(new AppError("Repository not found", 404));
    }
    if (
      repository.visibility === "private" &&
      (!req.user || req.user._id.toString() !== user._id.toString())
    ) {
      return next(new AppError("This repository is private", 403));
    }
    const { starsCount = 0, forksCount = 0 } = repository;
    return successResponse(res, 200, {
      id: repository._id,
      name: repository.name,
      description: repository.description,
      visibility: repository.visibility,
      defaultBranch: repository.defaultBranch,
      owner: repository.owner,
      starsCount,
      forksCount,
      isFork: repository.isFork,
      forkFrom: repository.forkFrom,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateRepository = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { name, description, visibility, defaultBranch } = req.body;
    const user = await User.findOne({ username: owner });
    if (!user) return next(new AppError("Owner not found", 404));
    const repository = await Repository.findOne({
      owner: user._id,
      $or: [{ name: repo.toLowerCase() }, { _id: repo }],
    });

    if (!repository) return next(new AppError("Repository not found", 404));
    if (!req.user || req.user._id.toString() !== user._id.toString()) {
      return next(
        new AppError("You are not authorized to update this repository", 403)
      );
    }

    if (name) repository.name = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (description !== undefined) repository.description = description;
    if (visibility) repository.visibility = visibility;
    if (defaultBranch) repository.defaultBranch = defaultBranch;

    const updatedRepo = await repository.save();
    await updatedRepo.populate("owner", "username name avatarUrl");

    return successResponse(res, 200, {
      message: "Repository updated successfully",
      repository: updatedRepo,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteRepository = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    const user = await User.findOne({ username: owner });
    if (!user) {
      return next(new AppError("Owner not found", 404));
    }
    const repository = await Repository.findOne({
      owner: user._id,
      $or: [{ name: repo.toLowerCase() }, { _id: repo }],
    });

    if (!repository) {
      return next(new AppError("Repository not found", 404));
    }
    const isOwner = req.user && req.user._id.toString() === user._id.toString();
    const isAdmin = req.user && req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return next(
        new AppError("You are not authorized to delete this repository", 403)
      );
    }

    await Branch.deleteMany({ repository: repository._id });
    await Commit.deleteMany({ repository: repository._id });
    await PullRequest.deleteMany({ repository: repository._id });
    await Issue.deleteMany({ repository: repository._id });

    await Repository.findByIdAndDelete(repository._id);

    return successResponse(res, 200, {
      message: "Repository deleted successfully",
      deletedRepo: {
        id: repository._id,
        name: repository.name,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getRepositoryCollaborators = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const user = await User.findOne({ username: owner });
    if (!user) {
      return next(new AppError("Owner not found", 404));
    }

    const repository = await Repository.findOne({
      _id: repo,
    }).populate("collaborators", "username name avatarUrl");

    if (!repository) {
      return next(new AppError("Repository not found", 404));
    }
    if (
      repository.visibility === "private" &&
      (!req.user || req.user._id.toString() !== user._id.toString())
    ) {
      return next(new AppError("This repository is private", 403));
    }
    const { starsCount = 0, forksCount = 0 } = repository;
    return successResponse(res, 200, {
      collaborators: repository.collaborators,
    });
  } catch (error) {
    return next(error);
  }
};

export const addCollaborator = async (req, res, next) => {
  try {
    const { owner, repo, username } = req.params;
    const { permission = "read" } = req.body;

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));
    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));
    const isOwner =
      req.user && req.user._id.toString() === ownerUser._id.toString();
    const isAdmin = req.user && req.user.role === "admin";

    if (!isOwner && !isAdmin)
      return next(
        new AppError("You are not authorized to add collaborators", 403)
      );
    const collaborator = await User.findOne({ username });
    if (!collaborator)
      return next(new AppError("Collaborator user not found", 404));
    let repoCollab = await RepoCollaborator.findOne({
      repo: repository._id,
      user: collaborator._id,
    });

    if (repoCollab) {
      if (repoCollab.permission !== permission) {
        repoCollab.permission = permission;
        await repoCollab.save();
      }
    } else {
      repoCollab = await RepoCollaborator.create({
        repo: repository._id,
        user: collaborator._id,
        permission,
      });
    }
    if (!repository.collaborators.includes(collaborator._id)) {
      repository.collaborators.push(collaborator._id);
    }
    const existingMeta = repository.collaboratorsMeta.find(
      (meta) => meta.user.toString() === collaborator._id.toString()
    );

    if (existingMeta) {
      existingMeta.permission = permission;
    } else {
      repository.collaboratorsMeta.push({
        user: collaborator._id,
        permission,
      });
    }

    await repository.save();

    return successResponse(res, 201, {
      message: `User ${username} added as collaborator with '${permission}' permission`,
      collaborator: {
        id: collaborator._id,
        username: collaborator.username,
        permission,
      },
    });
  } catch (error) {
    console.error("❌ addCollaborator error:", error);
    return next(error);
  }
};

export const updateCollaboratorPermission = async (req, res, next) => {
  try {
    const { owner, repo, username } = req.params;
    const { permission } = req.body;

    if (!["read", "write", "admin"].includes(permission)) {
      return next(new AppError("Invalid permission level", 400));
    }

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));

    const isOwner =
      req.user && req.user._id.toString() === ownerUser._id.toString();
    const isAdmin = req.user && req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return next(
        new AppError("You are not authorized to modify collaborators", 403)
      );

    const collaborator = await User.findOne({ username });
    if (!collaborator)
      return next(new AppError("Collaborator user not found", 404));

    const updated = await RepoCollaborator.findOneAndUpdate(
      { repo: repository._id, user: collaborator._id },
      { permission },
      { new: true }
    );

    if (!updated)
      return next(new AppError("Collaborator not found for this repo", 404));

    return successResponse(res, 200, {
      message: `Permission for ${username} updated to ${permission}`,
      collaborator: updated,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteCollaborator = async (req, res) => {
  try {
    const { owner, repo, username } = req.params;

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser)
      return res
        .status(404)
        .json({ success: false, message: "Owner not found" });

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository)
      return res
        .status(404)
        .json({ success: false, message: "Repository not found" });

    const isOwner = repository.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    const collaborator = await User.findOne({ username });
    if (!collaborator)
      return res
        .status(404)
        .json({ success: false, message: "Collaborator not found" });

    if (repository.collaborators.includes(collaborator._id)) {
      repository.collaborators.pull(collaborator._id);
      await repository.save();
    }
    await RepoCollaborator.findOneAndDelete({
      repo: repository._id,
      user: collaborator._id,
    });

    res.status(200).json({
      success: true,
      message: `Collaborator '${username}' removed successfully`,
    });
  } catch (error) {
    console.error("❌ Delete collaborator error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export default {
  createRepository,
  listRepository,
  getUserRepository,
  updateRepository,
  deleteRepository,
  getRepositoryCollaborators,
  addCollaborator,
  updateCollaboratorPermission,
  deleteCollaborator,
};
