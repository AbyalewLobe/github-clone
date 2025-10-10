import express from "express";
import searchController from "../controllers/search.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { search } from "../controllers/issue.controller.js";

const searchRoutes = express.Router();
searchRoutes
  .route("/users")
  .get(authMiddleware.protect, searchController.searchUsers);
searchRoutes
  .route("/repositories")
  .get(authMiddleware.protect, searchController.searchRepositories);
searchRoutes
  .route("/issues")
  .get(authMiddleware.protect, searchController.searchIssues);
searchRoutes
  .route("/pulls")
  .get(authMiddleware.protect, searchController.searchPullRequests);
searchRoutes
  .route("/code")
  .get(authMiddleware.protect, searchController.searchCode);
searchRoutes
  .route("/commits")
  .get(authMiddleware.protect, searchController.searchCommits);
searchRoutes
  .route("/all")
  .get(authMiddleware.protect, searchController.searchAll);

export default searchRoutes;
