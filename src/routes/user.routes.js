// src/routes/user.routes.js
import express from "express";
import userController from "../controllers/user.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
// import {protect} from "./middleware/authMiddleware.js"
import { protect } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

// 🟠 Admin only: list users
userRoutes.get("/", protect, userController.listUsers);

// 🟠 Self or Admin: update user
userRoutes.patch(
  "/:username",
  protect,
  userController.updateUser
);

// 🟠 Self or Admin: delete user
userRoutes.delete(
  "/:username",
  protect,
  userController.deleteUser
);
// 🟠 Admin only: change user role
userRoutes.patch(
  "/:username/role",
  protect,
  userController.changeUserRole
);

// 👥 Followers / Following
userRoutes.get(
  "/:username/following",
  protect,
  userController.getFollowing
);

userRoutes.get(
  "/:username/followers",
  protect,
  userController.getFollowers
);
userRoutes.get("/:username/", userController.getByUsername);
userRoutes.delete("/:username/unfollow", protect, userController.unfollow);

export default userRoutes;
