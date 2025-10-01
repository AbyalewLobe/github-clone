// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { sendError } from "../utils/response.js";

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return sendError(res, "Unauthorized", 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded user info
    next();
  } catch (err) {
    return sendError(res, "Invalid or expired token", 401);
  }
};

export default authMiddleware;
