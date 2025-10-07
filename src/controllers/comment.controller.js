// src/controllers/comment.controller.js
import Comment from "../models/Comment.js";
import Issue from "../models/Issue.js";
import { successResponse, errorResponse } from "../utils/response.js";

// List comments for a parent (Issue)
export const list = async (req, res) => {
  try {
    const { owner, repo, number } = req.params;

    // Find the parent issue
    const issue = await Issue.findOne({ number }).select("_id");
    if (!issue) return errorResponse(res, "Issue not found", 404);

    const comments = await Comment.find({
      parentKind: "Issue",
      parentId: issue._id,
    }).populate("author", "username avatarUrl");

    return successResponse(res, comments, "Comments fetched successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// Create a comment on an issue
export const create = async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const { body } = req.body;

    const issue = await Issue.findOne({ number });
    if (!issue) return errorResponse(res, "Issue not found", 404);

    const comment = await Comment.create({
      author: req.user._id,
      body,
      parentKind: "Issue",
      parentId: issue._id,
    });

    // Increment comment count
    issue.commentsCount += 1;
    await issue.save();

    return successResponse(res, comment, "Comment added successfully", 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// Update a comment (author only)
export const update = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { body } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) return errorResponse(res, "Comment not found", 404);
    if (!comment.author.equals(req.user._id))
      return errorResponse(res, "Unauthorized", 403);

    comment.body = body;
    await comment.save();

    return successResponse(res, comment, "Comment updated successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// Delete a comment (author or admin)
export const remove = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) return errorResponse(res, "Comment not found", 404);
    if (!comment.author.equals(req.user._id) && req.user.role !== "admin")
      return errorResponse(res, "Unauthorized", 403);

    await comment.remove();

    // Decrement comment count if parent is an Issue
    if (comment.parentKind === "Issue") {
      const issue = await Issue.findById(comment.parentId);
      if (issue) {
        issue.commentsCount = Math.max(0, issue.commentsCount - 1);
        await issue.save();
      }
    }

    return successResponse(res, {}, "Comment deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export default { list, create, update, remove };
