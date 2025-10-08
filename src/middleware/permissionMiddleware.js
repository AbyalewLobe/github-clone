import RepoCollaborator from "../models/RepoCollaborator.js";
import Repository from "../models/Repository.js";
import AppError from "../utils/appError.js";

/**
 * Middleware: hasWriteAccess
 * Allows users who are either:
 *  - Repo owner
 *  - Collaborator with "write" or "admin" permission
 */
export const hasWriteAccess = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user?._id;

    if (!userId) return next(new AppError("Not authenticated", 401));

    // 1️⃣ Find the repository by its name and owner
    const repository = await Repository.findOne({ name: repo }).select("owner _id");
    if (!repository) return next(new AppError("Repository not found", 404));

    // 2️⃣ If user is the repository owner → full access
    if (repository.owner.toString() === userId.toString()) return next();

    // 3️⃣ Otherwise, check collaborator permission
    const collaborator = await RepoCollaborator.findOne({
      repo: repository._id,
      user: userId,
      permission: { $in: ["write", "admin"] },
    });

    if (!collaborator)
      return next(new AppError("Write permission required", 403));

    // 4️⃣ Passed all checks → continue
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: isOwnerOrAdmin
 * Allows:
 *  - Repo owner
 *  - Collaborator with "admin" permission
 */
export const isOwnerOrAdmin = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user?._id;

    if (!userId) return next(new AppError("Not authenticated", 401));

    // 1️⃣ Find repository by its name (since routes use :repo = name)
    const repository = await Repository.findOne({ name: repo }).select("owner _id");
    if (!repository) return next(new AppError("Repository not found", 404));

    // 2️⃣ Owner always has admin access
    if (repository.owner.toString() === userId.toString()) return next();

    // 3️⃣ Check if user is a collaborator with admin permission
    const collaborator = await RepoCollaborator.findOne({
      repo: repository._id,
      user: userId,
      permission: "admin",
    });

    if (!collaborator)
      return next(new AppError("Admin permission required", 403));

    // 4️⃣ Passed all checks → continue
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: isRepoOwner
 * Strict owner check only
 */
export const isRepoOwner = async (req, res, next) => {
  try {
    const { repo } = req.params;
    const userId = req.user?._id;

    if (!userId) return next(new AppError("Not authenticated", 401));

    const repository = await Repository.findOne({ name: repo }).populate("owner", "_id");
    if (!repository) return next(new AppError("Repository not found", 404));

    if (repository.owner._id.toString() !== userId.toString())
      return next(new AppError("Only the repository owner can perform this action", 403));

    next();
  } catch (err) {
    next(err);
  }
};
