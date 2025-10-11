// src/app.js
import dotenv from "dotenv";
import settingRouter from "./routes/setting.routes.js";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import repoRouters from "./routes/repo.routes.js";
import globalErrorHandler from "./middleware/errorHandler.js";
import commitRouters from "./routes/commit.routes.js";
import orgRouter from "./routes/org.routes.js";


dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api", routes);  

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/repos", repoRouters);
app.use("/api/repos", commitRouters);
app.use("/api/settings", settingRouter);
app.use("/api/orgs", orgRouter);
// Root test route
app.get("/", (req, res) => {
  res.send("🚀 GitHub Clone API is running...");
});

app.use(globalErrorHandler);

export default app;
