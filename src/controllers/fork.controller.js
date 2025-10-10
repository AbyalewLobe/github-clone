import Repository from "../models/Repository.js";
import Fork from "../models/Fork.js";
import User from "../models/User.js";
import { successResponse } from "../utils/response.js";
import AppError from "../utils/appError.js";


// ✅ Fork a repository
export const forkRepo = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user._id; // from auth middleware

    // 1️⃣ Find the original repo owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser)
      return res.status(404).json({ success: false, message: "Owner not found" });

    // 2️⃣ Find the original repo
    const originalRepo = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!originalRepo)
      return res.status(404).json({ success: false, message: "Repository not found" });

    // 3️⃣ Check if user already forked this repo
    const existingFork = await Fork.findOne({
      user: userId,
      originalRepo: originalRepo._id,
    });
    if (existingFork)
      return res.status(400).json({ success: false, message: "Already forked" });

    // 4️⃣ Create new forked repo
    let forkName = originalRepo.name;
let counter = 1;

while (await Repository.findOne({ owner: userId, name: forkName })) {
  forkName = `${originalRepo.name}-fork${counter}`;
  counter++;
}

const forkedRepo = await Repository.create({
  name: forkName,
  description: originalRepo.description,
  owner: userId,
  isFork: true,
  forkedFrom: originalRepo._id,
  visibility: originalRepo.visibility,
});

    // 5️⃣ Record fork relation
    const fork = await Fork.create({
      user: userId,
      originalRepo: originalRepo._id,
      forkedRepo: forkedRepo._id,
    });

    // 6️⃣ Respond
    res.status(201).json({
      success: true,
      message: "Repository forked successfully",
      forkedRepo,
      fork,
    });
  } catch (err) {
    console.error("Error forking repository:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listForks = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    // 1️⃣ Find repo owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find the repository
    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));

    // 3️⃣ Find forks
    const forks = await Fork.find({ originalRepo: repository._id })
      .populate({
        path: "forkedRepo",
        select: "name description owner visibility createdAt",
        populate: { path: "owner", select: "username name avatarUrl" },
      })
      .sort({ createdAt: -1 });

    return successResponse(res, 200, {
      total: forks.length,
      forks: forks.map((f) => f.forkedRepo),
    });
  } catch (error) {
    return next(error);
  }
};

export const listUserForks = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1️⃣ Find all forks by the authenticated user
    const forks = await Fork.find({ user: userId })
      .populate({
        path: "forkedRepo",
        select: "name description owner visibility createdAt",
        populate: { path: "owner", select: "username name avatarUrl" },
      })
      .sort({ createdAt: -1 });

    return successResponse(res, 200, {
      total: forks.length,
      forks: forks.map((f) => f.forkedRepo),
    });
  } catch (error) {
    return next(error);
  }
};

export const checkUserFork = async (req, res, next) => {
  try {
    const { owner, repo, username } = req.params;

    // 1️⃣ Find owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repo
    const repository = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!repository) return next(new AppError("Repository not found", 404));

    // 3️⃣ Find user to check
    const user = await User.findOne({ username });
    if (!user) return next(new AppError("User not found", 404));

    // 4️⃣ Check if user has forked the repo
    const fork = await Fork.findOne({
      user: user._id,
      originalRepo: repository._id,
    });

    if (!fork) return res.status(404).json({ success: false, message: "User has not forked this repo" });

    return res.status(204).send(); // 204 No Content if fork exists
  } catch (error) {
    return next(error);
  }
};


export const unforkRepo = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user._id;

    // 1️⃣ Find the original owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find the original repository
    const originalRepo = await Repository.findOne({
      owner: ownerUser._id,
      name: repo.toLowerCase(),
    });
    if (!originalRepo) return next(new AppError("Repository not found", 404));

    // 3️⃣ Find the fork record
    const fork = await Fork.findOne({ user: userId, originalRepo: originalRepo._id });
    if (!fork) return next(new AppError("Fork not found", 404));

    // 4️⃣ Delete the forked repository
    await Repository.findByIdAndDelete(fork.forkedRepo);

    // 5️⃣ Delete the fork record
    await Fork.deleteOne({ _id: fork._id });

    return successResponse(res, 200, { message: "Fork deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

export default {
    forkRepo,
    listForks,
    listUserForks,
    checkUserFork,
    unforkRepo
};