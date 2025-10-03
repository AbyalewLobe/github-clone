// src/controllers/user.controller.js
import User from "../models/User.js";
import Follower from "../models/Follower.js";
import AppError from "../utils/appError.js";
import { successResponse } from "../utils/response.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

// ✅ Make sure you have Cloudinary env vars set in .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🟢 SIGNUP with avatar upload
export const signup = async (req, res, next) => {
  try {
    const { username, email, password, name, bio, role } = req.body;

    if (!username || !email || !password) {
      return next(
        new AppError("Username, email, and password are required", 400)
      );
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Handle avatar upload (if provided as Base64 string or URL)
    let avatarUrl = "";
    if (req.body.avatar) {
      const uploadResult = await cloudinary.uploader.upload(req.body.avatar, {
        folder: "avatars",
        public_id: `${username}-avatar`,
        overwrite: true,
      });
      avatarUrl = uploadResult.secure_url;
    }

    // ✅ Create new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      name,
      bio,
      role, // will default to 'user' if not provided
      avatarUrl,
    });

    return successResponse(
      res,
      {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
        role: newUser.role,
      },
      "User registered successfully"
    );
  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      const key = Object.keys(err.keyPattern)[0];
      return next(new AppError(`${key} already exists`, 409));
    }
    next(err);
  }
};

// 📌 GET Following
export const getFollowing = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return next(new AppError("User not found", 404));

    const following = await Follower.find({ follower: user._id }).populate(
      "following",
      "username name avatarUrl"
    );

    return successResponse(
      res,
      following.map((f) => f.following),
      "Following fetched successfully"
    );
  } catch (err) {
    next(err);
  }
};

// 📌 GET Followers
export const getFollowers = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return next(new AppError("User not found", 404));

    const followers = await Follower.find({ following: user._id }).populate(
      "follower",
      "username name avatarUrl"
    );

    return successResponse(
      res,
      followers.map((f) => f.follower),
      "Followers fetched successfully"
    );
  } catch (err) {
    next(err);
  }
};

// 🟠 ADMIN — List users with pagination & search
export const listUsers = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return next(new AppError("Forbidden: admin only", 403));
    }

    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "20"));
    const skip = (page - 1) * limit;

    const q = (req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { username: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { name: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return successResponse(res, { total, page, limit, users });
  } catch (err) {
    next(err);
  }
};

// 🟠 UPDATE USER — Self or Admin
export const updateUser = async (req, res, next) => {
  try {
    const { username } = req.params;

    if (req.user.username !== username && req.user.role !== "admin") {
      return next(
        new AppError("Forbidden: you can only update your own profile", 403)
      );
    }

    const updates = {};
    const allowedFields = [
      "name",
      "bio",
      "avatarUrl",
      "email",
      "username",
      "settings",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.password) {
      updates.password = await bcrypt.hash(req.body.password, 10);
    }

    // ✅ If avatar is sent during update, upload it
    if (req.body.avatar) {
      const uploadResult = await cloudinary.uploader.upload(req.body.avatar, {
        folder: "avatars",
        public_id: `${username}-avatar`,
        overwrite: true,
      });
      updates.avatarUrl = uploadResult.secure_url;
    }

    const user = await User.findOneAndUpdate({ username }, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) return next(new AppError("User not found", 404));

    return successResponse(res, user, "User updated successfully");
  } catch (err) {
    if (err.code === 11000) {
      const key = Object.keys(err.keyPattern)[0];
      return next(new AppError(`${key} already exists`, 409));
    }
    next(err);
  }
};

// 🟠 DELETE USER — Self or Admin
export const deleteUser = async (req, res, next) => {
  try {
    const { username } = req.params;

    if (req.user.username !== username && req.user.role !== "admin") {
      return next(
        new AppError("Forbidden: you can only delete your own account", 403)
      );
    }

    const user = await User.findOne({ username });
    if (!user) return next(new AppError("User not found", 404));

    await User.deleteOne({ _id: user._id });
    await Follower.deleteMany({
      $or: [{ follower: user._id }, { following: user._id }],
    });

    return successResponse(res, {}, "User deleted successfully");
  } catch (err) {
    next(err);
  }
};

export default {
  signup,
  getFollowers,
  getFollowing,
  listUsers,
  updateUser,
  deleteUser,
};
