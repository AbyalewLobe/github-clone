import express from "express";
import authController from "../controllers/auth.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const authRoutes = express.Router();

authRoutes.post("/signup", authController.signup);
authRoutes.get("/verify-email/:token", authController.verifyEmail); // ✅ New route
authRoutes.post("/login", authController.login);
authRoutes.post("/google", authController.googleLogin);

// Protected route example
authRoutes.get("/profile", protect, authController.getProfile);
authRoutes.post("/logout", protect, authController.logout);

// Forgot & Reset Password
authRoutes.post("/forgot-password", authController.forgotPassword); // ✅ New route
authRoutes.post("/reset-password/:token", authController.resetPassword); // ✅ New route

export default authRoutes;
