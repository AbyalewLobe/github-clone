// src/controllers/auth.controller.js
import User from "../models/User.js";
import AppError from "../utils/appError.js";
import { successResponse } from "../utils/response.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { signToken } from "../utils/jwt.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import sendEmail from "../utils/Email.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==============================
// 📧 Nodemailer Transporter
// ==============================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==============================
// 🔐 Helper: Create and Send JWT
// ==============================
const createSendToken = (user, statusCode, res) => {
  const token = signToken({ id: user._id });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const safeUser = user.toObject();
  delete safeUser.password;

  return successResponse(
    res,
    { user: safeUser, token },
    "Authentication successful",
    statusCode
  );
};

// ==============================
// 📝 Signup + Email Verification
// ==============================
export const signup = async (req, res, next) => {
  try {
    let { username, email, password } = req.body;

    // Normalize input
    username = username.trim();
    email = email.trim().toLowerCase();

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Create user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: Date.now() + 60 * 60 * 1000, // 1 hour
      isVerified: false,
    });

    // Prepare verification email
    const verifyURL = `${process.env.FRONTEND_URL}/verify-email/${rawToken}`;
    const subject = "Verify Your Email";
    const message = `Thanks for signing up! Please verify your email by clicking the link: ${verifyURL}`;
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Welcome, ${newUser.username}! 🎯</h2>
        <p>
          Thanks for signing up. Please verify your email by clicking the button
          below:
        </p>
        <a
          href="${verifyUrl}"
          style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
        >
          Verify Email
        </a>
        <p>
          If the button doesn't work, copy and paste this link in your browser:
        </p>
        <p>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
      </div>`;

    // Send email
    try {
      await sendEmail({
        email: newUser.email,
        subject,
        message,
        html: htmlMessage,
      });

      return res.status(201).json({
        status: "success",
        message:
          "User created! Please check your email to verify your account.",
      });
    } catch (err) {
      // If email fails, delete the created user
      await User.findByIdAndDelete(newUser._id);
      console.error("Error sending verification email:", err);
      return next(
        new AppError(
          "There was an error sending the email. Try again later.",
          500
        )
      );
    }
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }
    next(err);
  }
};

// ==============================
// ✉️ Verify Email Token
// ==============================
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });
    if (!user)
      return next(new AppError("Invalid or expired verification token", 400));

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;

    await user.save();

    return successResponse(
      res,
      {},
      "Email verified successfully. You can now log in."
    );
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔐 Login (with verification check)
// ==============================
export const login = async (req, res, next) => {
  try {
    let { email, password } = req.body;
    email = email.trim().toLowerCase();

    const user = await User.findOne({ email }).select("+password");
    if (!user) return next(new AppError("Invalid email or password", 401));

    if (!user.isVerified)
      return next(
        new AppError("Please verify your email before logging in", 403)
      );

    const valid = await comparePassword(password, user.password);
    if (!valid) return next(new AppError("Invalid email or password", 401));

    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ==============================
// 👤 Get Profile (Protected)
// ==============================
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return next(new AppError("User not found", 404));

    return successResponse(res, user, "Profile fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 📧 Forgot Password
// ==============================
export const forgotPassword = async (req, res, next) => {
  try {
    let { email } = req.body;
    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) return next(new AppError("No user found with that email", 404));

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset",
      html: `<p>You requested to reset your password. Click the link below to reset:</p>
             <a href="${resetURL}">${resetURL}</a>
             <p>If you didn't request this, you can safely ignore this email.</p>`,
    });

    return successResponse(res, {}, "Password reset link sent to your email");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🔁 Reset Password
// ==============================
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return next(new AppError("Invalid or expired reset token", 400));

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return successResponse(res, {}, "Password reset successful");
  } catch (err) {
    next(err);
  }
};

// ==============================
// 🌐 Google Login
// ==============================
export const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return next(new AppError("Google ID token is required", 400));

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name, picture } = ticket.getPayload();
    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const baseUsername = email.split("@")[0].trim();
      let username = baseUsername;
      let count = 1;

      // Ensure unique username
      while (await User.findOne({ username })) {
        username = `${baseUsername}${count}`;
        count++;
      }

      user = await User.create({
        username,
        email: normalizedEmail,
        name,
        avatar_url: picture,
        googleId: sub,
        authProvider: "google",
        isVerified: true,
        password: "",
      });
    }

    const appToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = user.toObject();
    delete safeUser.password;

    return successResponse(
      res,
      { user: safeUser, token: appToken },
      "Google login successful"
    );
  } catch (err) {
    return next(new AppError(err.message, 500));
  }
};

// ==============================
// 📤 Export all controllers
// ==============================
export default {
  signup,
  verifyEmail,
  login,
  getProfile,
  forgotPassword,
  resetPassword,
  googleLogin,
};
