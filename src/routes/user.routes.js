// src/routes/user.routes.js
import express from "express";
import userController from "../controllers/user.controller.js";
import { authMiddleware, protect } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

// 🟠 Admin only: list users
userRoutes.get("/", protect, userController.listUsers);

// 🟠 Self or Admin: update user
userRoutes.patch("/:username", protect, userController.updateUser);

// 🟠 Self or Admin: delete user
userRoutes.delete("/:username", protect, userController.deleteUser);

// 🟠 Admin only: change user role
userRoutes.patch("/:username/role", protect, userController.changeUserRole);

// 👥 Followers / Following
userRoutes.get("/:username/following", protect, userController.getFollowing);
userRoutes.get("/:username/followers", protect, userController.getFollowers);

// 🟠 Get user by username (public)
userRoutes.get("/:username", userController.getByUsername);

export default userRoutes;
