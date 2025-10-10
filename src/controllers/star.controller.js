import Star from "../models/Star.js";
import Repository from "../models/Repository.js";
import User from "../models/User.js";
import { successResponse } from "../utils/response.js";
import AppError from "../utils/appError.js";


export const createStar = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user._id;
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) {
      return next({ status: 404, message: "Owner not found" });
    }
    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });

    if (!repository) {
      return next({ status: 404, message: "Repository not found" });
    }
    const existingStar = await Star.findOne({ user: userId, repo: repository._id });
    if (existingStar) {
      return next({ status: 400, message: "Already starred this repository" });
    }
    const star = await Star.create({ user: userId, repo: repository._id });

    return res.status(201).json({
      success: true,
      message: "Repository starred successfully",
      data: star,
    });
  } catch (error) {
    console.error("Error starring repo:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeStar = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user._id;

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) {
      return next({ status: 404, message: "Owner not found" });
    }
    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });

    if (!repository) {
      return next({ status: 404, message: "Repository not found" });
    }
    const star = await Star.findOne({ user: userId, repo: repository._id });
    if (!star) {
      return next({ status: 400, message: "You haven’t starred this repository" });
    }
    await Star.deleteOne({ _id: star._id });

    return res.status(200).json({
      success: true,
      message: "Repository unstarred successfully",
    });
  } catch (error) {
    console.error("Error unstarring repo:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listStargazers = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repository = await Repository.findOne({ name: repo })
      .populate("owner", "username")
      .exec();

    if (!repository || repository.owner.username !== owner) {
      return next(new AppError("Repository not found", 404));
    }
    const stars = await Star.find({ repo: repository._id })
      .populate("user", "username name avatarUrl")
      .sort({ createdAt: -1 });
    return successResponse(res, 200, {
      count: stars.length,
      stargazers: stars.map((s) => s.user),
    });
  } catch (error) {
    console.error("❌ Error fetching stargazers:", error);
    return next(error);
  }
};

export const listUserStarredRepos = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const stars = await Star.find({ user: userId })
      .populate({
        path: "repo",
        populate: { path: "owner", select: "username name avatarUrl" },
      })
      .sort({ createdAt: -1 });

    const starredRepos = stars.map((s) => ({
      _id: s.repo._id,
      name: s.repo.name,
      description: s.repo.description,
      visibility: s.repo.visibility,
      owner: s.repo.owner,
      starredAt: s.createdAt,
    }));

    return successResponse(res, 200, {
      count: starredRepos.length,
      starred: starredRepos,
    });
  } catch (error) {
    console.error("❌ Error listing user starred repos:", error);
    return next(error);
  }
};


export const listUserStarredReposByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const stars = await Star.find({ user: user._id })
      .populate({
        path: "repo",
        select: "name owner description visibility createdAt updatedAt",
        populate: { path: "owner", select: "username avatarUrl" },
      })
      .sort({ createdAt: -1 });

    const starredRepos = stars.map((s) => s.repo);

    res.status(200).json({
      success: true,
      count: starredRepos.length,
      repositories: starredRepos,
    });
  } catch (err) {
    console.error("Error in getUserStarredRepos:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const checkIfUserStarredRepo = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user._id; 

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser)
      return res.status(404).json({ success: false, message: "Owner not found" });
    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repository)
      return res.status(404).json({ success: false, message: "Repository not found" });

    const star = await Star.findOne({ user: userId, repo: repository._id });

    if (star) {
      return res.status(204).send(); 
    } else {
      return res.status(404).json({ success: false, message: "Not starred" });
    }
  } catch (err) {
    console.error("Error checking if repo is starred:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default {
    createStar,
    removeStar,
    listStargazers,
    listUserStarredRepos,
    listUserStarredReposByUsername ,
    checkIfUserStarredRepo
};
