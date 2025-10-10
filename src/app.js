import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

import routes from "./routes/index.js";
import globalErrorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(cookieParser());

// Mount API
app.use("/api", routes);

// Root test route
app.get("/", (req, res) => {
  res.send("🚀 GitHub Clone API is running...");
});

// Global error handler
app.use(globalErrorHandler);

export default app;
