import User from "../models/User.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("settings");
    if (!user) return errorResponse(res, "User not found", 404);

    return successResponse(res, { settings: user.settings || {} }, "Fetched user settings");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const updateSettings = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { settings: req.body } },
      { new: true }
    ).select("settings");

    if (!user) return errorResponse(res, "User not found", 404);

    return successResponse(res,  user.settings , "Settings updated successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const resetSettings = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { settings: {} } },
      { new: true }
    );
    if (!user) return errorResponse(res, "User not found", 404);

    return successResponse(res, null, "Settings reset to default");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
