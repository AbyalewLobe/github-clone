// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/response.js";
import User from "../models/User.js";
import AppError from "../utils/appError.js";

const authMiddleware = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You are not logged in. Please log in.", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError("The user no longer exists.", 401));
    }

    req.user = user; // attach full user object
    next();
  } catch (err) {
    return next(new AppError("Invalid or expired token", 401));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (
      !roles.includes(req.user.role) &&
      req.user.username !== req.params.owner
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "You are not logged in. Please log in to access.",
    });
  }

  try {
    // ✅ Verify token safely
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};


export {authMiddleware, protect, authorize};

 
