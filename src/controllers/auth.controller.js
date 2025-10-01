// src/controllers/auth.controllers.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendSuccess, sendError } from "../utils/response.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ======================
// Register (Local Signup)
// ======================
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return sendError(res, "All fields are required", 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return sendError(res, "Email already registered", 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      authProvider: "local",
    });

    // don’t return password
    const safeUser = user.toObject();
    delete safeUser.password_hash;

    return sendSuccess(res, safeUser, "User registered successfully", 201);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// ======================
// Login (Local Signin)
// ======================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, "All fields are required", 400);

    const user = await User.findOne({ email });
    if (!user) return sendError(res, "Invalid email or password", 401);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return sendError(res, "Invalid email or password", 401);

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = user.toObject();
    delete safeUser.password_hash;

    return sendSuccess(res, { user: safeUser, token }, "Login successful");
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// ======================
// Get Profile (Protected)
// ======================
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // set by authMiddleware
    const user = await User.findById(userId).select("-password_hash");
    if (!user) return sendError(res, "User not found", 404);

    return sendSuccess(res, user, "Profile fetched successfully");
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// ======================
// Google Login
// ======================
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return sendError(res, "Google ID token is required", 400);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        username: email.split("@")[0],
        email,
        name,
        avatar_url: picture,
        googleId: sub,
        authProvider: "google",
        password_hash: "", // Google users don’t need passwords
      });
    }

    const appToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = user.toObject();
    delete safeUser.password_hash;

    return sendSuccess(res, { user: safeUser, token: appToken }, "Google login successful");
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};
