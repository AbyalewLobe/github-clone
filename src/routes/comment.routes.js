// src/routes/comment.routes.js
import express from "express";
import commentController from "../controllers/comment.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const commentRoutes = express.Router({ mergeParams: true });

// Public: list comments of an issue
commentRoutes.get("/", commentController.list);

// Authenticated routes
commentRoutes.use(authMiddleware.authMiddleware);
commentRoutes.use(authMiddleware);

// Add a comment to an issue
commentRoutes.post("/", commentController.create);

// Update a comment
commentRoutes.patch("/:commentId", commentController.update);

// Delete a comment
commentRoutes.delete("/:commentId", commentController.remove);

export default commentRoutes;
