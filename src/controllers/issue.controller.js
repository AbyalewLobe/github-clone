// src/controllers/issue.controller.js
import Issue from "../models/Issue.js";
import Repository from "../models/Repository.js";
import User from "../models/User.js";
import { successResponse, errorResponse } from "../utils/response.js";
import mongoose from "mongoose";

// ==============================
// 🔹 List all issues in a repository
// GET /api/repos/:owner/:repo/issues
// ==============================
export const list = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    const repository = await Repository.findOne({ name: repo }).populate('owner');
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issues = await Issue.find({ repo: repository._id }).populate('author', 'username avatarUrl');

    return successResponse(res, issues, "Issues fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Create a new issue
// POST /api/repos/:owner/:repo/issues
// ==============================
export const create = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { title, description, assignees = [], labels = [] } = req.body;

    const repository = await Repository.findOne({ name: repo }).populate('owner');
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const lastIssue = await Issue.findOne({ repo: repository._id }).sort({ number: -1 });
    const nextNumber = lastIssue ? lastIssue.number + 1 : 1;

    const newIssue = await Issue.create({
      repo: repository._id,
      number: nextNumber,
      title,
      description,
      author: req.user._id,
      assignees,
      labels,
    });

    return successResponse(res, newIssue, "Issue created successfully", 201);
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Get a single issue
// GET /api/repos/:owner/:repo/issues/:number
// ==============================
export const get = async (req, res, next) => {
  try {
    const { repo, number } = req.params;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number }).populate('author assignees', 'username avatarUrl');
    if (!issue) return errorResponse(res, "Issue not found", 404);

    return successResponse(res, issue, "Issue fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Update an issue
// PATCH /api/repos/:owner/:repo/issues/:number
// ==============================
export const update = async (req, res, next) => {
  try {
    const { repo, number } = req.params;
    const { title, description } = req.body;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    // Permission check: only author or repo collaborator with write
    if (!issue.author.equals(req.user._id) && !repository.collaborators.includes(req.user._id))
      return errorResponse(res, "Forbidden", 403);

    if (title) issue.title = title;
    if (description) issue.description = description;

    await issue.save();

    return successResponse(res, issue, "Issue updated successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Delete an issue
// DELETE /api/repos/:owner/:repo/issues/:number
// ==============================
export const remove = async (req, res, next) => {
  try {
    const { repo, number } = req.params;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    // Permission check: author or repo admin
    if (!issue.author.equals(req.user._id) && !req.user._id.equals(repository.owner))
      return errorResponse(res, "Forbidden", 403);

    await issue.remove();

    return successResponse(res, {}, "Issue deleted successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Close an issue
// PATCH /api/repos/:owner/:repo/issues/:number/close
// ==============================
export const close = async (req, res, next) => {
  try {
    const { repo, number } = req.params;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    if (!issue.author.equals(req.user._id) && !repository.collaborators.includes(req.user._id))
      return errorResponse(res, "Forbidden", 403);

    issue.status = "closed";
    await issue.save();

    return successResponse(res, issue, "Issue closed successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Reopen an issue
// PATCH /api/repos/:owner/:repo/issues/:number/reopen
// ==============================
export const reopen = async (req, res, next) => {
  try {
    const { repo, number } = req.params;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    if (!issue.author.equals(req.user._id) && !repository.collaborators.includes(req.user._id))
      return errorResponse(res, "Forbidden", 403);

    issue.status = "open";
    await issue.save();

    return successResponse(res, issue, "Issue reopened successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Search issues
// GET /api/repos/:owner/:repo/issues/search?q=...
// ==============================
export const search = async (req, res, next) => {
  try {
    const { repo } = req.params;
    const { q } = req.query;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issues = await Issue.find({
      repo: repository._id,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    });

    return successResponse(res, issues, "Search results");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Labels
// ==============================
export const listLabels = async (req, res, next) => {
  try {
    const { repo, number } = req.params;
    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    return successResponse(res, issue.labels || [], "Labels fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const addLabels = async (req, res, next) => {
  try {
    const { repo, number } = req.params;
    const { labels = [] } = req.body;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    // Only owner/admin
    if (!req.user._id.equals(repository.owner) && !repository.collaborators.includes(req.user._id))
      return errorResponse(res, "Forbidden", 403);

    issue.labels = Array.from(new Set([...issue.labels, ...labels]));
    await issue.save();

    return successResponse(res, issue.labels, "Labels added successfully");
  } catch (err) {
    next(err);
  }
};

export const removeLabel = async (req, res, next) => {
  try {
    const { repo, number, label } = req.params;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    if (!req.user._id.equals(repository.owner) && !repository.collaborators.includes(req.user._id))
      return errorResponse(res, "Forbidden", 403);

    issue.labels = issue.labels.filter(l => l !== label);
    await issue.save();

    return successResponse(res, issue.labels, "Label removed successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Assignees
// ==============================
export const listAssignees = async (req, res, next) => {
  try {
    const { repo, number } = req.params;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number }).populate('assignees', 'username avatarUrl');
    if (!issue) return errorResponse(res, "Issue not found", 404);

    return successResponse(res, issue.assignees, "Assignees fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const addAssignees = async (req, res, next) => {
  try {
    const { repo, number } = req.params;
    const { assignees = [] } = req.body;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    if (!req.user._id.equals(repository.owner) && !repository.collaborators.includes(req.user._id))
      return errorResponse(res, "Forbidden", 403);

    issue.assignees = Array.from(new Set([...issue.assignees.map(a => a.toString()), ...assignees]));
    await issue.save();

    const populated = await Issue.findById(issue._id).populate('assignees', 'username avatarUrl');

    return successResponse(res, populated.assignees, "Assignees added successfully");
  } catch (err) {
    next(err);
  }
};

export const removeAssignee = async (req, res, next) => {
  try {
    const { repo, number, userId } = req.params;

    const repository = await Repository.findOne({ name: repo });
    if (!repository) return errorResponse(res, "Repository not found", 404);

    const issue = await Issue.findOne({ repo: repository._id, number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    if (!req.user._id.equals(repository.owner) && !repository.collaborators.includes(req.user._id))
      return errorResponse(res, "Forbidden", 403);

    issue.assignees = issue.assignees.filter(a => a.toString() !== userId);
    await issue.save();

    const populated = await Issue.findById(issue._id).populate('assignees', 'username avatarUrl');

    return successResponse(res, populated.assignees, "Assignee removed successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔹 Export all controllers
// ==============================
export default {
  list,
  create,
  get,
  update,
  remove,
  close,
  reopen,
  search,
  listLabels,
  addLabels,
  removeLabel,
  listAssignees,
  addAssignees,
  removeAssignee,
};
