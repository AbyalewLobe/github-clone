
import User from "../models/User.js"; // Add .js extension
import AppError from "../utils/appError.js";
import { successResponse } from "../utils/response.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { signToken } from "../utils/jwt.js";

// Helper to create and send token
const createSendToken = (user, statusCode, res) => {
  const token = signToken({ id: user._id });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return successResponse(res, { user, token }, "Authentication successful", statusCode);
};

// Signup
export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    next(err);
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return next(new AppError("Invalid email or password", 401));

    const valid = await comparePassword(password, user.password);
    if (!valid) return next(new AppError("Invalid email or password", 401));

    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ======================
// Get Profile (Protected)
// ======================
export const getProfile = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    return successResponse(res, user, "Profile fetched successfully");
  } catch (err) {
    next(err);
  }
};


// ======================
// Google Login
// ======================
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return sendError(res, "Google ID token is required", 400);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        username: email.split("@")[0],
        email,
        name,
        avatar_url: picture,
        googleId: sub,
        authProvider: "google",
        password_hash: "", // Google users don’t need passwords
      });
    }

    const appToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = user.toObject();
    delete safeUser.password_hash;

    return sendSuccess(res, { user: safeUser, token: appToken }, "Google login successful");
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// Export as default object
export default {
  signup,
  login,
  getProfile,
  googleLogin
};




