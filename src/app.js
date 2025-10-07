// src/app.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// Routes
import routes from "./routes/index.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import repoRoutes from "./routes/repo.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import commentRoutes from "./routes/comment.routes.js";

// Middleware
import globalErrorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(cookieParser());

// ==============================
// 🔹 Routes
// ==============================
app.use("/api", routes);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/repos", repoRoutes);

// Nested routes under /api/repos/:owner/:repo
app.use("/api/repos/:owner/:repo/issues", issueRoutes);
app.use("/api/repos/:owner/:repo/comments", commentRoutes);

// Root test route
app.get("/", (req, res) => {
  res.send("🚀 GitHub Clone API is running...");
});

// Global error handler
app.use(globalErrorHandler);

export default app;
