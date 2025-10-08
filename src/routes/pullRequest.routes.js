import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import pullRequestController from "../controllers/pullRequest.controller.js";

const pullRequestRouter = express.Router({ mergeParams: true });

pullRequestRouter
  .route("/:owner/:repo/pulls")
  .get(authMiddleware.protect, pullRequestController.listPullRequests)
  .post(authMiddleware.protect, pullRequestController.createPullRequest);
pullRequestRouter
  .route("/:owner/:repo/pulls/:number")
  .get(authMiddleware.protect, pullRequestController.getPullRequestDetails)
  .patch(authMiddleware.protect, pullRequestController.updatePullRequest);
pullRequestRouter
  .route("/:owner/:repo/pulls/:number/merge")
  .post(authMiddleware.protect, pullRequestController.mergePullRequest);
pullRequestRouter
  .route("/:owner/:repo/pulls/:number/reviews")
  .post(authMiddleware.protect, pullRequestController.addPullRequestReview)
  .get(authMiddleware.protect, pullRequestController.listPullRequestReviews);
pullRequestRouter
  .route("/:owner/:repo/pulls/:number/reviews/:id")
  .patch(authMiddleware.protect, pullRequestController.updatePullRequestReview)
  .delete(
    authMiddleware.protect,
    pullRequestController.deletePullRequestReview
  );

export default pullRequestRouter;
