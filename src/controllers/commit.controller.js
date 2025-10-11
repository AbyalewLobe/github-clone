import crypto from "crypto";
import Commit from "../models/Commit.js";
import User from "../models/User.js";
import Branch from "../models/Branch.js";
import Repository from "../models/Repository.js";
import { successResponse, errorResponse } from "../utils/response.js";

/**
 * @desc List commits in a repo (optionally by branch)
 * @route GET /api/repos/:owner/:repo/commits
 * @access Public
 */
export const listCommits = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { branchName, page = 1, limit = 20 } = req.query;

    // Find the repository
   const ownerUser = await User.findOne({ username: owner });
if (!ownerUser) return errorResponse(res, "Owner not found", 404);

const repository = await Repository.findOne({
  owner: ownerUser._id,
  name: repo,
}).populate("owner", "username");

if (!repository) return errorResponse(res, "Repository not found", 404);
    // Optional branch filter
    let branchFilter = {};
    if (branchName) {
      const branch = await Branch.findOne({ repo: repository._id, name: branchName });
      if (!branch) return errorResponse(res, "Branch not found", 404);
      branchFilter.branch = branch._id;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const commits = await Commit.find({ repo: repository._id, ...branchFilter })
      .populate("author", "username avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Commit.countDocuments({ repo: repository._id, ...branchFilter });

    return successResponse(res, { commits, total }, "Commits fetched successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

/**
 * @desc Get a single commit by SHA
 * @route GET /api/repos/:owner/:repo/commits/:sha
 * @access Public
 */
export const getCommit = async (req, res) => {
  try {
    const { owner, repo, sha } = req.params;

    // Find repository
       const ownerUser = await User.findOne({ username: owner });
if (!ownerUser) return errorResponse(res, "Owner not found", 404);

const repository = await Repository.findOne({
  owner: ownerUser._id,
  name: repo,
}).populate("owner", "username");

if (!repository) return errorResponse(res, "Repository not found", 404);

    // Find commit
    const commit = await Commit.findOne({ repo: repository._id, hash: sha })
      .populate("author", "username email avatarUrl");

    if (!commit) return errorResponse(res, "Commit not found", 404);

    return successResponse(res, commit, "Commit fetched successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

/**
 * @desc Create a new commit
 * @route POST /api/repos/:owner/:repo/commits
 * @access Private (write)
 */
export const createCommit = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { branchName, message, files, parents } = req.body;
    const authorId = req.user._id;

    if (!branchName || !message) {
      return errorResponse(res, "branchName and message are required", 400);
    }

    // Find repository
     const ownerUser = await User.findOne({ username: owner });
if (!ownerUser) return errorResponse(res, "Owner not found", 404);

const repository = await Repository.findOne({
  owner: ownerUser._id,
  name: repo,
}).populate("owner", "username");
if (!repository) return errorResponse(res, "Repository not found", 404);

    // Find branch
    const branch = await Branch.findOne({ repo: repository._id, name: branchName });
    // if (!branch) return errorResponse(res, "Branch not found", 404);

    // Generate commit hash
    const hash = crypto
      .createHash("sha1")
      .update(`${Date.now()}-${authorId}-${message}`)
      .digest("hex");

    // Create commit
    const newCommit = await Commit.create({
      repo: repository._id,
      // branch: branch._id,
      author: authorId,
      message,
      hash,
      parents,
      files,
    });

    // Update branch head
    // branch.headSha = hash;
    // await branch.save();

    return successResponse(res, newCommit, "Commit created successfully", 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
