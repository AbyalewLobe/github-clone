import User from "../models/User.js";
import Follower from "../models/Follower.js";
import AppError from "../utils/appError.js";
import { successResponse } from "../utils/response.js";

//get following
export const getFollowing = async (req, res, next) => {
  try {
    const { username } = req.params;

    // find the user first
    const user = await User.findOne({ username });
    if (!user) return next(new AppError("User not found", 404));

    // find all users that this user follows
    const following = await Follower.find({ follower: user._id }).populate(
      "following",
      "username name avatar_url"
    );

    return successResponse(
      res,
      following.map((f) => f.following), // return following user info
      "Following fetched successfully"
    );
  } catch (err) {
    next(err);
  }
};

//get followers
export const getFollowers = async (req, res, next) => {
  try {
    const { username } = req.params;

    // find the user first
    const user = await User.findOne({ username });
    if (!user) return next(new AppError("User not found", 404));

    // find all users who follow this user
    const followers = await Follower.find({ following: user._id }).populate(
      "follower",
      "username name avatar_url"
    );

    return successResponse(
      res,
      followers.map((f) => f.follower), // return follower user info
      "Followers fetched successfully"
    );
  } catch (err) {
    next(err);
  }
};

export default {
  getFollowers,
  getFollowing,
};
