// src/middleware/errorHandler.js
import { sendError } from "../utils/response.js";

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default values
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return sendError(res, message, statusCode);
};

export default errorHandler;
