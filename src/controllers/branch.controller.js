import Branch from "../models/Branch.js";
import Repository from "../models/Repository.js";
import Commit from "../models/Commit.js";
import mongoose from "mongoose";
import AppError from "../utils/appError.js";

/**
 * List all branches of a repository
 */
export const list = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repository = await Repository.findOne({ name: repo })
      .populate("owner", "username")
      .lean();

    if (!repository) return next(new AppError("Repository not found", 404));

    const branches = await Branch.find({ repo: repository._id }).lean();
    res.status(200).json(branches);
  } catch (err) {
    next(err);
  }
};

/**
 * Get details of a specific branch
 */
export const get = async (req, res, next) => {
  try {
    const { owner, repo, name } = req.params;

    const repository = await Repository.findOne({ name: repo }).lean();
    if (!repository) return next(new AppError("Repository not found", 404));

    const branch = await Branch.findOne({ repo: repository._id, name }).lean();
    if (!branch) return next(new AppError("Branch not found", 404));

    res.status(200).json(branch);
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new branch
 * Supports from (branch name) or fromCommit (hash)
 */
export const create = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { name, from, fromCommit } = req.body;
   
    const repository = await Repository.findOne({ name: repo });
    if (!repository) return next(new AppError("Repository not found", 404));

    // Check duplicate branch
    const existing = await Branch.findOne({ repo: repository._id, name });
    if (existing) return next(new AppError("Branch already exists", 400));

    let baseCommitSha;

    if (fromCommit) {
      const commit = await Commit.findOne({
        repo: repository._id,
        hash: fromCommit,
      });
      if (!commit) return next(new AppError("Base commit not found", 404));
      baseCommitSha = commit.hash;
    } else {
      const baseBranchName = from || repository.defaultBranch;
      const baseBranch = await Branch.findOne({
        repo: repository._id,
        name: baseBranchName,
      });
      if (!baseBranch)
        return next(
          new AppError(`Base branch '${baseBranchName}' not found`, 404)
        );
      baseCommitSha = baseBranch.headSha;
    }

    const newBranch = await Branch.create({
      repo: repository._id,
      name,
      headSha: baseCommitSha,
    });

    res.status(201).json(newBranch);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a branch (only owner/admin if not protected)
 */
export const remove = async (req, res, next) => {
  try {
    const { owner, repo, name } = req.params;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return next(new AppError("Repository not found", 404));

    const branch = await Branch.findOne({ repo: repository._id, name });
    if (!branch) return next(new AppError("Branch not found", 404));

    if (branch.protected)
      return next(new AppError("Cannot delete a protected branch", 403));

    await branch.deleteOne();
    res.status(200).json({ message: "Branch deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Rename a branch
 */
export const rename = async (req, res, next) => {
  try {
    const { owner, repo, oldName } = req.params;
    const { newName } = req.body;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return next(new AppError("Repository not found", 404));

    const branch = await Branch.findOne({ repo: repository._id, name: oldName });
    if (!branch) return next(new AppError("Branch not found", 404));

    const existing = await Branch.findOne({ repo: repository._id, name: newName });
    if (existing)
      return next(new AppError("Branch with new name already exists", 400));

    branch.name = newName;
    await branch.save();

    res.status(200).json({ message: "Branch renamed", branch });
  } catch (err) {
    next(err);
  }
};

/**
 * List commits in a branch
 */
export const listCommits = async (req, res, next) => {
  try {
    const { owner, repo, name } = req.params;
    const repository = await Repository.findOne({ name: repo });
    if (!repository) return next(new AppError("Repository not found", 404));

    const branch = await Branch.findOne({ repo: repository._id, name });
    if (!branch) return next(new AppError("Branch not found", 404));

    const commits = await Commit.find({ branch: branch._id })
      .sort({ timestamp: -1 })
      .lean();

    res.status(200).json(commits);
  } catch (err) {
    next(err);
  }
};

/**
 * Compare two branches
 */
export const compare = async (req, res, next) => {
  try {
    const { owner, repo, base, head } = req.params;
    const repository = await Repository.findOne({ name: repo });
    if (!repository) return next(new AppError("Repository not found", 404));

    const baseBranch = await Branch.findOne({ repo: repository._id, name: base });
    const headBranch = await Branch.findOne({ repo: repository._id, name: head });
    if (!baseBranch || !headBranch)
      return next(new AppError("Base or head branch not found", 404));

    const baseCommits = await Commit.find({ branch: baseBranch._id });
    const headCommits = await Commit.find({ branch: headBranch._id });

    const ahead = headCommits.filter(
      (c) => !baseCommits.some((b) => b.hash === c.hash)
    );
    const behind = baseCommits.filter(
      (b) => !headCommits.some((c) => c.hash === b.hash)
    );

    res.status(200).json({
      base,
      head,
      aheadBy: ahead.length,
      behindBy: behind.length,
      ahead,
      behind,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Branch protection endpoints
 */
export const getProtection = async (req, res, next) => {
  try {
    const { owner, repo, name } = req.params;
    const repository = await Repository.findOne({ name: repo });
    if (!repository) return next(new AppError("Repository not found", 404));

    const branch = await Branch.findOne({ repo: repository._id, name });
    if (!branch) return next(new AppError("Branch not found", 404));

    res.status(200).json({ protected: branch.protected });
  } catch (err) {
    next(err);
  }
};

export const setProtection = async (req, res, next) => {
  try {
    const { owner, repo, name } = req.params;
    const { protected: isProtected } = req.body;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return next(new AppError("Repository not found", 404));

    const branch = await Branch.findOne({ repo: repository._id, name });
    if (!branch) return next(new AppError("Branch not found", 404));

    branch.protected = !!isProtected;
    await branch.save();

    res.status(200).json({ message: "Branch protection updated", branch });
  } catch (err) {
    next(err);
  }
};

export const removeProtection = async (req, res, next) => {
  try {
    const { owner, repo, name } = req.params;
    const repository = await Repository.findOne({ name: repo });
    if (!repository) return next(new AppError("Repository not found", 404));

    const branch = await Branch.findOne({ repo: repository._id, name });
    if (!branch) return next(new AppError("Branch not found", 404));

    branch.protected = false;
    await branch.save();

    res.status(200).json({ message: "Branch protection removed", branch });
  } catch (err) {
    next(err);
  }
};
