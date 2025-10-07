// src/routes/issue.routes.js
import express from "express";
import issueController from "../controllers/issue.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const issueRoutes = express.Router({ mergeParams: true });

// ==============================
// 🔹 Public routes
// ==============================
issueRoutes.get("/", issueController.list); // List all issues
issueRoutes.get("/search", issueController.search); // Search issues
issueRoutes.get("/:number", issueController.get); // Get single issue
issueRoutes.get("/:number/labels", issueController.listLabels); // List labels

// ==============================
// 🔹 Authenticated routes
// ==============================
issueRoutes.post("/", authMiddleware, issueController.create); // Create issue
issueRoutes.patch("/:number", authMiddleware, issueController.update); // Update issue
issueRoutes.delete("/:number", authMiddleware, issueController.remove); // Delete issue
issueRoutes.patch("/:number/close", authMiddleware, issueController.close); // Close issue
issueRoutes.patch("/:number/reopen", authMiddleware, issueController.reopen); // Reopen issue

// ==============================
// 🔹 Labels management (owner/admin)
// ==============================
issueRoutes.post("/:number/labels", authMiddleware, issueController.addLabels);
issueRoutes.delete("/:number/labels/:label", authMiddleware, issueController.removeLabel);

// ==============================
// 🔹 Assignees management (owner/admin)
// ==============================
issueRoutes.get("/:number/assignees", authMiddleware, issueController.listAssignees);
issueRoutes.post("/:number/assignees", authMiddleware, issueController.addAssignees);
issueRoutes.delete("/:number/assignees/:userId", authMiddleware, issueController.removeAssignee);

export default issueRoutes;
