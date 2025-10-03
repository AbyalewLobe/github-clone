import express from "express";
import userController from "../controllers/user.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

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
