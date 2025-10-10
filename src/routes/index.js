import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import repoRoutes from "./repo.routes.js";
import fileRoutes from "./file.routes.js"; // ✅ updated Express router
import branchRoutes from "./branch.routes.js";
import issueRoutes from "./issue.routes.js";
import commentRoutes from "./comment.routes.js";
import starRoutes from "./star.routes.js";
import forkRoutes from "./fork.routes.js";
import searchRoutes from "./search.routes.js";
import pullRequestRoutes from "./pullRequest.routes.js";

const router = Router();

// Public routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// Repository-level routes
router.use("/repos", repoRoutes); // repo management
router.use("/repos", fileRoutes); // file API (list/get)
router.use("/repos", forkRoutes);
router.use("/repos", starRoutes);
router.use("/repos", searchRoutes);

// Nested routes under a specific repository
router.use("/repos/:owner/:repo/issues", issueRoutes);
router.use("/repos/:owner/:repo/comments", commentRoutes);
router.use("/repos/:owner/:repo/branches", branchRoutes);
router.use("/repos", pullRequestRoutes);

export default router;
