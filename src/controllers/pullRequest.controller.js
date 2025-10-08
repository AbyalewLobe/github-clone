import PullRequest from "../models/PullRequest.js";
import Repository from "../models/Repository.js";
import Branch from "../models/Branch.js";
import User from "../models/User.js";
import Commit from "../models/Commit.js";
import Comment from "../models/Comment.js";
import File from "../models/File.js";
import Review from "../models/Review.js";
import AppError from "../utils/appError.js";
import { successResponse } from "../utils/response.js";

export const listPullRequests = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const {
      state,
      author,
      reviewer,
      sort = "-createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });

    if (!repository) return next(new AppError("Repository not found", 404));
    const isOwner =
      req.user && req.user._id.toString() === ownerUser._id.toString();

    const isCollaborator =
      req.user &&
      repository.collaborators.some(
        (c) => c.toString() === req.user._id.toString()
      );

    if (repository.visibility === "private" && !isOwner && !isCollaborator) {
      return next(new AppError("This repository is private", 403));
    }

    const filter = { repo: repository._id };

    if (state) filter.status = state.toLowerCase();

    if (author) {
      const authorUser = await User.findOne({ username: author });
      if (!authorUser) return next(new AppError("Author not found", 404));
      filter.author = authorUser._id;
    }

    if (reviewer) {
      const reviewerUser = await User.findOne({ username: reviewer });
      if (!reviewerUser) return next(new AppError("Reviewer not found", 404));
      filter.reviewers = reviewerUser._id;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const pullRequests = await PullRequest.find(filter)
      .populate("author", "username name avatarUrl")
      .populate("reviewers", "username name avatarUrl")
      .populate("sourceBranch", "name")
      .populate("targetBranch", "name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await PullRequest.countDocuments(filter);
    return successResponse(res, 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: pullRequests.length,
      pullRequests,
    });
  } catch (error) {
    return next(error);
  }
};

export const createPullRequest = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { title, description, head, base, reviewers = [] } = req.body;

    if (!title || !head || !base) {
      return next(
        new AppError("Title, head, and base branches are required", 400)
      );
    }
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));
    const isOwner = req.user._id.toString() === ownerUser._id.toString();
    const collaboratorMeta = repository.collaboratorsMeta.find(
      (c) => c.user.toString() === req.user._id.toString()
    );
    const hasWriteAccess =
      collaboratorMeta &&
      ["write", "admin"].includes(collaboratorMeta.permission);

    if (!isOwner && !hasWriteAccess) {
      return next(
        new AppError("You do not have permission to create a pull request", 403)
      );
    }
    const sourceBranch = await Branch.findOne({
      repo: repository._id,
      name: head,
    });
    if (!sourceBranch) return next(new AppError("Head branch not found", 404));

    const targetBranch = await Branch.findOne({
      repo: repository._id,
      name: base,
    });
    if (!targetBranch) return next(new AppError("Base branch not found", 404));

    if (sourceBranch._id.toString() === targetBranch._id.toString()) {
      return next(
        new AppError("Head and base branches must be different", 400)
      );
    }
    const existingPR = await PullRequest.findOne({
      repo: repository._id,
      sourceBranch: sourceBranch._id,
      targetBranch: targetBranch._id,
      status: "open",
    });
    if (existingPR) {
      return next(
        new AppError("A pull request for these branches already exists", 400)
      );
    }
    const reviewerIds = [];
    for (const username of reviewers) {
      const reviewerUser = await User.findOne({ username });
      if (reviewerUser) reviewerIds.push(reviewerUser._id);
    }
    const lastPR = await PullRequest.findOne({ repo: repository._id })
      .sort({ number: -1 })
      .select("number");

    const nextNumber = lastPR ? lastPR.number + 1 : 1;

    // 7️⃣ (Optional) Check for conflicts between head and base branches
    // For now, mark as clean (future: compare commit SHAs)
    const baseSha = targetBranch.latestCommit || "unknown";
    const headSha = sourceBranch.latestCommit || "unknown";

    const pullRequest = await PullRequest.create({
      repo: repository._id,
      number: nextNumber,
      title,
      description,
      author: req.user._id,
      sourceBranch: sourceBranch._id,
      targetBranch: targetBranch._id,
      headSha,
      baseSha,
      reviewers: reviewerIds,
    });

    return successResponse(res, 201, {
      message: "Pull request created successfully",
      pullRequest,
    });
  } catch (error) {
    console.error("❌ Pull request creation error:", error);
    return next(error);
  }
};

export const getPullRequestDetails = async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));

    const pullRequest = await PullRequest.findOne({
      repo: repository._id,
      number: parseInt(number),
    })
      .populate("author", "username email avatarUrl")
      .populate("reviewers", "username email avatarUrl")
      .lean();

    if (!pullRequest) return next(new AppError("Pull request not found", 404));

    const commits = await Commit.find({
      pullRequest: pullRequest._id,
    }).sort({ createdAt: 1 });

    const comments = await Comment.find({
      pullRequest: pullRequest._id,
    })
      .populate("author", "username avatarUrl")
      .sort({ createdAt: 1 });
    const sourceBranch = await Branch.findOne({
      repo: repository._id,
      name: pullRequest.head,
    });
    const targetBranch = await Branch.findOne({
      repo: repository._id,
      name: pullRequest.base,
    });

    let mergeable = false;
    if (sourceBranch && targetBranch) {
      // You can expand this check by comparing commit SHAs, but for now:
      mergeable = sourceBranch.headSha !== targetBranch.headSha;
    }
    const responseData = {
      number: pullRequest.number,
      title: pullRequest.title,
      description: pullRequest.description,
      state: pullRequest.state,
      author: pullRequest.author,
      reviewers: pullRequest.reviewers,
      commits,
      comments,
      mergeable,
      createdAt: pullRequest.createdAt,
      updatedAt: pullRequest.updatedAt,
    };

    return successResponse(res, 200, responseData);
  } catch (error) {
    console.error("❌ Error fetching pull request details:", error);
    return next(error);
  }
};

export const updatePullRequest = async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const { title, description, reviewers, state } = req.body;

    // 1️⃣ Find repository and owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));

    // 2️⃣ Find the pull request
    const pullRequest = await PullRequest.findOne({
      repo: repository._id,
      number: parseInt(number),
    });

    if (!pullRequest) return next(new AppError("Pull request not found", 404));

    // 3️⃣ Authorization: PR author, repo owner, or assigned reviewer
    const isAuthor = req.user._id.toString() === pullRequest.author.toString();
    const isOwner = req.user._id.toString() === ownerUser._id.toString();
    const isReviewer = pullRequest.reviewers.some(
      (rev) => rev.toString() === req.user._id.toString()
    );

    if (!isAuthor && !isOwner && !isReviewer) {
      return next(
        new AppError("You are not authorized to update this pull request", 403)
      );
    }

    // 4️⃣ Update fields
    if (title) pullRequest.title = title;
    if (description) pullRequest.description = description;

    // 5️⃣ Update reviewers (if provided)
    if (Array.isArray(reviewers)) {
      const validReviewers = await User.find({
        username: { $in: reviewers },
      });

      if (validReviewers.length !== reviewers.length) {
        return next(
          new AppError("Some reviewers were not found in the system", 400)
        );
      }

      pullRequest.reviewers = validReviewers.map((u) => u._id);
    }

    // 6️⃣ Update state if provided
    if (state) {
      const allowedStates = ["open", "closed", "merged", "draft", "ready"];
      if (!allowedStates.includes(state)) {
        return next(
          new AppError(
            "Invalid state. Allowed: open, closed, merged, draft, ready",
            400
          )
        );
      }
      pullRequest.state = state;
    }

    await pullRequest.save();

    return successResponse(res, 200, {
      message: "Pull request updated successfully",
      pullRequest,
    });
  } catch (error) {
    console.error("❌ Error updating pull request:", error);
    return next(error);
  }
};

export const mergePullRequest = async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const { strategy = "merge" } = req.body; // merge, squash, rebase

    // 1️⃣ Find repository
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));

    // 2️⃣ Find PR by repo ObjectId + number
    const pr = await PullRequest.findOne({
      repo: repository._id,
      number: Number(number),
    }).populate("sourceBranch targetBranch author reviewers");

    if (!pr) return next(new AppError("Pull request not found", 404));

    // 3️⃣ Permission check (owner, admin, or write collaborator)
    const isOwner = req.user._id.toString() === ownerUser._id.toString();
    const collaboratorMeta = repository.collaboratorsMeta.find(
      (c) => c.user.toString() === req.user._id.toString()
    );
    const hasWriteAccess =
      collaboratorMeta &&
      ["write", "admin"].includes(collaboratorMeta.permission);

    if (!isOwner && !hasWriteAccess)
      return next(
        new AppError("You do not have permission to merge this PR", 403)
      );

    // 4️⃣ Check PR status
    if (pr.status !== "open")
      return next(new AppError("Pull request is not open", 400));

    // 5️⃣ (Optional) Check for conflicts - simplified
    // In real Git, we'd diff commits and files between branches
    // Here we just simulate
    const headCommits = await Commit.find({ branch: pr.sourceBranch._id });
    const baseCommits = await Commit.find({ branch: pr.targetBranch._id });
    const hasConflicts = false; // Can implement real conflict detection later
    if (hasConflicts) return next(new AppError("Merge conflict detected", 409));

    // 6️⃣ Perform merge (mocked)
    let mergeMessage = `Merged PR #${pr.number}: ${pr.title}`;
    let mergeCommitSha = `merge_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .substring(2, 10)}`;

    if (strategy === "squash") {
      // Combine all commit messages into one
      mergeMessage =
        "Squashed commits:\n" + headCommits.map((c) => c.message).join("\n");
    } else if (strategy === "rebase") {
      // Simulate rebase by keeping head commits but changing branch ref
      // (For simplicity, we won't actually reorder commits in DB)
    }

    const mergedCommit = await Commit.create({
      repo: repository._id,
      branch: pr.targetBranch._id,
      author: req.user._id,
      message: mergeMessage,
      hash: mergeCommitSha,
      parents: [pr.headSha, pr.baseSha].filter(Boolean),
      files: headCommits.flatMap((c) => c.files),
    });
    pr.status = "merged";
    pr.mergeCommitSha = mergeCommitSha;
    await pr.save();

    return successResponse(res, 200, {
      message: `Pull request #${pr.number} merged successfully`,
      mergeCommitSha,
      pullRequest: pr,
    });
  } catch (error) {
    console.error("❌ Merge PR error:", error);
    return next(error);
  }
};

export const deletePullRequest = async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));
    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));
    const pr = await PullRequest.findOne({
      repo: repository._id,
      number: Number(number),
    });

    if (!pr) return next(new AppError("Pull request not found", 404));
    const isOwner = req.user._id.toString() === ownerUser._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return next(
        new AppError("You are not authorized to delete this pull request", 403)
      );
    }
    await pr.deleteOne();

    return successResponse(res, 200, {
      message: `Pull request #${number} deleted successfully`,
      deletedPR: {
        id: pr._id,
        title: pr.title,
        number: pr.number,
      },
    });
  } catch (error) {
    console.error("❌ Delete PR error:", error);
    return next(error);
  }
};

export const addPullRequestReview = async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const { state, comment } = req.body;

    if (!["approved", "changes_requested", "comment"].includes(state)) {
      return next(new AppError("Invalid review state", 400));
    }

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));

    const pr = await PullRequest.findOne({
      repo: repository._id,
      number: Number(number),
    });
    if (!pr) return next(new AppError("Pull request not found", 404));
    const isOwner = req.user._id.toString() === ownerUser._id.toString();
    const isReviewer = pr.reviewers
      .map((r) => r.toString())
      .includes(req.user._id.toString());
    const collaboratorMeta = repository.collaboratorsMeta.find(
      (c) => c.user.toString() === req.user._id.toString()
    );
    const hasWriteAccess =
      collaboratorMeta &&
      ["write", "admin"].includes(collaboratorMeta.permission);

    if (!isOwner && !isReviewer && !hasWriteAccess) {
      return next(new AppError("Not authorized to review this PR", 403));
    }
    const review = await Review.create({
      pullRequest: pr._id,
      reviewer: req.user._id,
      state,
      comment,
    });

    if (!pr.reviewers.includes(req.user._id)) {
      pr.reviewers.push(req.user._id);
      await pr.save();
    }

    return successResponse(res, 201, {
      message: `Review added: ${state}`,
      review,
      updatedPR: pr,
    });
  } catch (error) {
    console.error("❌ Add PR review error:", error);
    return next(error);
  }
};

export const listPullRequestReviews = async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));
    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));
    const pr = await PullRequest.findOne({
      repo: repository._id,
      number: Number(number),
    });
    if (!pr) return next(new AppError("Pull request not found", 404));
    const isOwner =
      req.user && req.user._id.toString() === ownerUser._id.toString();
    const isCollaborator = repository.collaborators.includes(req.user?._id);
    if (repository.visibility === "private" && !isOwner && !isCollaborator) {
      return next(new AppError("This repository is private", 403));
    }

    const reviews = await Review.find({ pullRequest: pr._id })
      .populate("reviewer", "username name avatarUrl")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, {
      pullRequest: {
        id: pr._id,
        number: pr.number,
        title: pr.title,
      },
      reviews,
    });
  } catch (error) {
    console.error("❌ List PR reviews error:", error);
    return next(error);
  }
};

export const updatePullRequestReview = async (req, res, next) => {
  try {
    const { owner, repo, number, id } = req.params;
    const { type, comment } = req.body;

    if (type && !["approve", "request_changes", "comment"].includes(type)) {
      return next(new AppError("Invalid review type", 400));
    }
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));
    const pr = await PullRequest.findOne({
      repo: repository._id,
      number: Number(number),
    });
    if (!pr) return next(new AppError("Pull request not found", 404));

    const review = await Review.findById(id);
    if (!review) return next(new AppError("Review not found", 404));

    if (review.reviewer.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to update this review", 403));
    }
    if (type) review.type = type;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    return successResponse(res, 200, {
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Update PR review error:", error);
    return next(error);
  }
};

export const deletePullRequestReview = async (req, res, next) => {
  try {
    const { owner, repo, number, id } = req.params;

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));

    const pr = await PullRequest.findOne({
      repo: repository._id,
      number: Number(number),
    });
    if (!pr) return next(new AppError("Pull request not found", 404));

    const review = await Review.findById(id);
    if (!review) return next(new AppError("Review not found", 404));

    const isOwner = repository.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isReviewer = review.reviewer.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isReviewer) {
      return next(new AppError("Not authorized to delete this review", 403));
    }
    await review.remove();

    return successResponse(res, 200, {
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete PR review error:", error);
    return next(error);
  }
};

export default {
  listPullRequests,
  createPullRequest,
  getPullRequestDetails,
  updatePullRequest,
  mergePullRequest,
  deletePullRequest,
  addPullRequestReview,
  listPullRequestReviews,
  updatePullRequestReview,
  deletePullRequestReview,
};
