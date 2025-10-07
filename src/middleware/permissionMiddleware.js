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
    const { repo } = req.params;
    const userId = req.user?._id;

    if (!userId) return next(new AppError("Not authenticated", 401));

    const repository = await Repository.findOne({ name: repo }).populate("owner", "_id");
    if (!repository) return next(new AppError("Repository not found", 404));

    // Check owner
    if (repository.owner._id.toString() === userId.toString()) return next();

    // Check collaborator permission
    const collaborator = repository.collaboratorsMeta.find(
      (c) =>
        c.user.toString() === userId.toString() &&
        ["write", "admin"].includes(c.permission)
    );

    if (!collaborator) return next(new AppError("Write permission required", 403));

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
    const { repo } = req.params;
    const userId = req.user?._id;

    if (!userId) return next(new AppError("Not authenticated", 401));

    const repository = await Repository.findOne({ name: repo }).populate("owner", "_id");
    if (!repository) return next(new AppError("Repository not found", 404));

    // Owner check
    if (repository.owner._id.toString() === userId.toString()) return next();

    // Admin collaborator check
    const collaborator = repository.collaboratorsMeta.find(
      (c) =>
        c.user.toString() === userId.toString() &&
        c.permission === "admin"
    );

    if (!collaborator)
      return next(new AppError("Admin permission required", 403));

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
