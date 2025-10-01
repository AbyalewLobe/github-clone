// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/response.js";
import User from '../models/User.js'

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return errorResponse(res, "Unauthorized", 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded user info
    next();
  } catch (err) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
};


export const protect = async (req, res, next) => {
  let token;

  // Get token from header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("You are not logged in. Please log in to access.", 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError("The user no longer exists.", 401));
  }

  req.user = user;
  next();
};


export default {authMiddleware,protect};
