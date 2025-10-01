// src/routes/auth.routes.js
import express from "express";
import { register, login, getProfile, googleLogin } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);

// Protected route
router.get("/profile", authMiddleware, getProfile);

export default router;
