// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String }, // empty if Google user
    name: { type: String },
    bio: { type: String },
    avatar_url: { type: String },

    // Fields for social login
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: { type: String }, // store Google’s user ID
  },
  { timestamps: true }
);

// Default export for ES modules
const User = mongoose.model("User", userSchema);
export default User;
