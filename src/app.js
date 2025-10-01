// src/app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import authRoutes from "./routes/auth.routes.js";
import globalErrorHandler from './middleware/errorHandler.js';


dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api", routes);

app.use("/api/auth", authRoutes);


// Root test route
app.get("/", (req, res) => {
  res.send("🚀 GitHub Clone API is running...");
});

app.use(globalErrorHandler);

export default app;
