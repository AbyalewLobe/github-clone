import express from "express";
import {
  list,
  get,
  create,
  remove,
  rename,
  listCommits,
  compare,
  getProtection,
  setProtection,
  removeProtection,
} from "../controllers/branch.controller.js";

import { protect } from "../middleware/authMiddleware.js";
import { hasWriteAccess, isOwnerOrAdmin } from "../middleware/permissionMiddleware.js";

const branchRoutes = express.Router({ mergeParams: true });

// Public
branchRoutes.get("/", list);
branchRoutes.get("/:name", get);
branchRoutes.get("/:name/commits", listCommits);
branchRoutes.get("/compare/:base/:head", compare);

// Protected operations
branchRoutes.post("/", protect, hasWriteAccess, create);
branchRoutes.delete("/:name", protect, isOwnerOrAdmin, remove);
branchRoutes.patch("/:oldName/rename", protect, isOwnerOrAdmin, rename);

// Branch protection
branchRoutes.get("/:name/protection", protect, getProtection);
branchRoutes.put("/:name/protection", protect, isOwnerOrAdmin, setProtection);
branchRoutes.delete("/:name/protection", protect, isOwnerOrAdmin, removeProtection);

export default branchRoutes;
