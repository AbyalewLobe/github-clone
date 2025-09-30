import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import routes from "./routes/index.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// All routes
app.use("/api", routes);

// Root test route
app.get("/", (req, res) => {
  res.send("🚀 GitHub Clone API is running...");
});

export default app;
