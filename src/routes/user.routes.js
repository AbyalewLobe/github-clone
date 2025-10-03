// src/routes/user.routes.js
import express from "express";
import userController from "../controllers/user.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

// 🟠 Admin only: list users
userRoutes.get("/", authMiddleware.protect, userController.listUsers);

// 🟠 Self or Admin: update user
userRoutes.patch("/:username", authMiddleware.protect, userController.updateUser);

// 🟠 Self or Admin: delete user
userRoutes.delete("/:username", authMiddleware.protect, userController.deleteUser);

// 👥 Followers / Following
userRoutes.get(
  "/:username/following",
  authMiddleware.protect,
  userController.getFollowing
);

userRoutes.get(
  "/:username/followers",
  authMiddleware.protect,
  userController.getFollowers
);

export default userRoutes;
