import express from "express";
import fileController from "../controllers/file.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const fileRoutes = express.Router({ mergeParams: true });

fileRoutes.get("/:owner/:repo/readme", fileController.getReadme);
fileRoutes.get("/:owner/:repo/archive/:format", fileController.getArchive);
fileRoutes.get("/:owner/:repo/tree/:sha", fileController.getRepoTree);
fileRoutes.get("/:owner/:repo/files/blob/:sha", fileController.getFileByBlob);
fileRoutes.get(
  "/:owner/:repo/files/:path/commits",
  fileController.getFileCommitHistory
);
fileRoutes.get(
  "/:owner/:repo/compare/:base...:head",
  fileController.compareCommitsOrBranches
);

// List all files in a repository (optional ?ref=branchOrCommit)
fileRoutes.get("/:owner/:repo/files", fileController.listRepoFiles);

// Get a single file by path (supports paths with slashes).
// Since path-to-regexp in this environment doesn't accept multi-segment
// named params, we accept the file path via query param `?path=dir/file.txt`.
fileRoutes.get("/:owner/:repo/file", fileController.getFileContent);
fileRoutes.post(
  "/:owner/:repo/files",
  authMiddleware.protect,
  fileController.uploadOrUpdateFile
);
// Delete a file — accept the file path via query param or request body to avoid
// path-to-regexp issues with multi-segment named params.
// DELETE /api/repos/:owner/:repo/file?path=dir/sub/file.txt
fileRoutes.delete(
  "/:owner/:repo/file",
  authMiddleware.protect,
  fileController.deleteFile
);

export default fileRoutes;
