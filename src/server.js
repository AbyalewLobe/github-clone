// src/server.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app.js"; // ✅ import your configured Express app

const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ MONGO_URI is not defined in .env");
  process.exit(1);
}

// ✅ Mongoose v6+ doesn’t need extra options
mongoose.connect(mongoUri)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
