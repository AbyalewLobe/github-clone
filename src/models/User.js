// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // empty if Google user
    name: { type: String },
    bio: { type: String },
    avatar_url: { type: String },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: { type: String },

    // 📩 Email verification
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },

    // 🔐 Forgot password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
