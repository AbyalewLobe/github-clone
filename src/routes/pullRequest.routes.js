import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import pullRequestController from "../controllers/pullRequest.controller.js";

const pullRequestRouter = express.Router({ mergeParams: true });

// List and create pull requests
pullRequestRouter
  .route("/:owner/:repo/pulls")
  .get(protect, pullRequestController.listPullRequests)
  .post(protect, pullRequestController.createPullRequest);

// Pull request details, update
pullRequestRouter
  .route("/:owner/:repo/pulls/:number")
  .get(protect, pullRequestController.getPullRequestDetails)
  .patch(protect, pullRequestController.updatePullRequest);

// Merge pull request
pullRequestRouter
  .route("/:owner/:repo/pulls/:number/merge")
  .post(protect, pullRequestController.mergePullRequest);

// Pull request reviews
pullRequestRouter
  .route("/:owner/:repo/pulls/:number/reviews")
  .post(protect, pullRequestController.addPullRequestReview)
  .get(protect, pullRequestController.listPullRequestReviews);

pullRequestRouter
  .route("/:owner/:repo/pulls/:number/reviews/:id")
  .patch(protect, pullRequestController.updatePullRequestReview)
  .delete(protect, pullRequestController.deletePullRequestReview);

export default pullRequestRouter;
