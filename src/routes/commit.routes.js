import { Router } from "express";
import { listCommits, getCommit ,createCommit} from "../controllers/commit.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const commitRouters = Router();

commitRouters.get("/:owner/:repo/commits", listCommits);
commitRouters.get("/:owner/:repo/commits/:sha", getCommit);
commitRouters.post("/:owner/:repo/commits", protect, createCommit);

export default commitRouters;
