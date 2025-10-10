import User from "../models/User.js";
import Branch from "../models/Branch.js";
import Commit from "../models/Commit.js";
import File from "../models/File.js";
import Repository from "../models/Repository.js";
import AppError from "../utils/appError.js";
import crypto from "crypto";
import archiver from "archiver";

/**
 * List all files in a repository
 * GET /api/repos/:owner/:repo/files?ref=:ref
 */
export const listRepoFiles = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { ref } = req.query;

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // Resolve commit
    let commit;
    if (ref) {
      const branch = await Branch.findOne({ repo: repoDoc._id, name: ref });
      if (branch) {
        commit = await Commit.findOne({ branch: branch._id })
          .sort({ createdAt: -1 })
          .populate("author", "username");
      } else {
        commit = await Commit.findOne({
          repo: repoDoc._id,
          hash: ref,
        }).populate("author", "username");
      }
    } else {
      const defaultBranch = await Branch.findOne({
        repo: repoDoc._id,
        name: repoDoc.defaultBranch,
      });
      if (!defaultBranch)
        return next(new AppError("Default branch not found", 404));
      commit = await Commit.findOne({ branch: defaultBranch._id })
        .sort({ createdAt: -1 })
        .populate("author", "username");
    }

    if (!commit) return next(new AppError("No commit found", 404));

    const files = await File.find({
      repository: repoDoc._id,
      commit: commit._id,
    });

    res.status(200).json({
      success: true,
      repo: `${owner}/${repo}`,
      ref: ref || repoDoc.defaultBranch,
      commit: {
        hash: commit.hash,
        message: commit.message,
        author: commit.author?.username,
        date: commit.createdAt,
      },
      count: files.length,
      files: files.map((f) => ({
        path: f.path,
        size: f.size,
        type: f.type,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single file content
 * GET /api/repos/:owner/:repo/files/:path?ref=:ref
 */
export const getFileContent = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    // Support path coming from either params (legacy) or query string
    // e.g., GET /api/repos/:owner/:repo/file?path=dir/sub/file.txt&ref=...
    let path = req.params.path || req.query.path;
    const { ref } = req.query;

    if (!path)
      return next(new AppError("File path is required (use ?path=...)", 400));

    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // Resolve commit
    let commit;
    if (ref) {
      const branch = await Branch.findOne({ repo: repoDoc._id, name: ref });
      if (branch) {
        commit = await Commit.findOne({ branch: branch._id })
          .sort({ createdAt: -1 })
          .populate("author", "username");
      } else {
        commit = await Commit.findOne({
          repo: repoDoc._id,
          hash: ref,
        }).populate("author", "username");
      }
    } else {
      const defaultBranch = await Branch.findOne({
        repo: repoDoc._id,
        name: repoDoc.defaultBranch,
      });
      if (!defaultBranch)
        return next(new AppError("Default branch not found", 404));
      commit = await Commit.findOne({ branch: defaultBranch._id })
        .sort({ createdAt: -1 })
        .populate("author", "username");
    }

    if (!commit) return next(new AppError("No commit found", 404));

    // Find file by full path
    const file = await File.findOne({
      repository: repoDoc._id,
      commit: commit._id,
      path,
    });
    if (!file) return next(new AppError("File not found", 404));

    res.status(200).json({
      success: true,
      repo: `${owner}/${repo}`,
      ref: ref || repoDoc.defaultBranch,
      commit: {
        hash: commit.hash,
        message: commit.message,
        author: commit.author?.username,
        date: commit.createdAt,
      },
      file: {
        path: file.path,
        size: file.size,
        type: file.type,
        content: file.content,
        updatedAt: file.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const uploadOrUpdateFile = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const {
      path: filePath,
      content,
      commitMessage,
      branch: branchName,
    } = req.body;
    const userId = req.user._id;

    if (!filePath || !content || !commitMessage)
      return next(
        new AppError("path, content, and commitMessage are required", 400)
      );

    // 1️⃣ Find owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repository
    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // 3️⃣ Determine branch
    let branch = await Branch.findOne({
      repo: repoDoc._id,
      name: branchName || repoDoc.defaultBranch,
    });

    if (!branch) {
      const defaultBranch = await Branch.findOne({
        repo: repoDoc._id,
        name: repoDoc.defaultBranch,
      });

      const latestCommit = await Commit.findOne({
        branch: defaultBranch._id,
      }).sort({ createdAt: -1 });

      branch = await Branch.create({
        repo: repoDoc._id,
        name: branchName || "new-branch",
        headSha: latestCommit?._id || null,
      });
    }

    // 4️⃣ Determine parent commit
    const parentCommit = await Commit.findOne({ branch: branch._id }).sort({
      createdAt: -1,
    });

    // 5️⃣ Generate new commit
    const commitHash = crypto
      .createHash("sha1")
      .update(`${commitMessage}-${Date.now()}`)
      .digest("hex");

    const newCommit = await Commit.create({
      repo: repoDoc._id,
      branch: branch._id,
      author: userId,
      message: commitMessage,
      hash: commitHash,
      parents: parentCommit ? [parentCommit._id] : [],
    });

    // 6️⃣ Calculate file SHA (use `content`, not `fileContent`)
    const fileHash = crypto.createHash("sha1").update(content).digest("hex");

    // 7️⃣ Upload or update file
    let file = await File.findOne({ repository: repoDoc._id, path: filePath });
    if (!file) {
      // Create new file entry
      file = await File.create({
        repository: repoDoc._id,
        path: filePath,
        content,
        size: Buffer.byteLength(content),
        type: "file",
        hash: fileHash, // ✅ Save blob SHA
        commit: newCommit._id,
      });
    } else {
      // Update existing file entry
      file.content = content;
      file.size = Buffer.byteLength(content);
      file.hash = fileHash;
      file.commit = newCommit._id;
      await file.save();
    }

    // 8️⃣ Update branch head
    branch.headSha = newCommit._id;
    await branch.save();

    // 9️⃣ Return response
    res.status(201).json({
      success: true,
      repo: `${owner}/${repo}`,
      branch: branch.name,
      commit: {
        hash: newCommit.hash,
        message: newCommit.message,
        author: req.user.username,
        parents: newCommit.parents,
        date: newCommit.createdAt,
      },
      file: {
        path: file.path,
        size: file.size,
        type: file.type,
        content: file.content,
        hash: file.hash, // ✅ include blob SHA in response
        updatedAt: file.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    // Support file path coming from params (legacy), query or body.
    // Prefer params.path if present, otherwise fall back to query or body.
    const filePath = req.params.path || req.query.path || req.body.path; // the path of the file to delete
    const { branch: branchName, commitMessage } = req.body;
    const userId = req.user._id; // logged-in user

    if (!filePath)
      return next(
        new AppError("File path is required (use ?path=... or body.path)", 400)
      );

    if (!branchName || !commitMessage)
      return next(new AppError("Branch and commitMessage are required", 400));

    // 1️⃣ Find owner user
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repository
    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // 3️⃣ Find branch
    const branch = await Branch.findOne({
      repo: repoDoc._id,
      name: branchName,
    });
    if (!branch) return next(new AppError("Branch not found", 404));

    // 4️⃣ Find latest commit
    const latestCommit = await Commit.findById(branch.latestCommit);
    if (!latestCommit)
      return next(new AppError("No commits found on this branch", 404));

    // 5️⃣ Find the file
    const file = await File.findOne({
      repository: repoDoc._id,
      commit: latestCommit._id,
      path: filePath,
    });

    if (!file) return next(new AppError("File not found", 404));

    // 6️⃣ Create new commit for deletion
    const newCommitHash = crypto.randomBytes(20).toString("hex");

    const newCommit = await Commit.create({
      repo: repoDoc._id,
      branch: branch._id,
      author: userId,
      message: commitMessage,
      hash: newCommitHash,
      parents: [latestCommit._id],
      files: [
        {
          path: filePath,
          action: "deleted",
          hash: file.hash,
        },
      ],
    });

    // 7️⃣ Update branch latest commit
    branch.latestCommit = newCommit._id;
    branch.headSha = newCommit.hash;
    await branch.save();

    // 8️⃣ Optionally, remove file document (or keep for history)
    await File.deleteOne({ _id: file._id });

    res.status(200).json({
      success: true,
      message: `File '${filePath}' deleted successfully.`,
      commit: {
        hash: newCommit.hash,
        message: newCommit.message,
        author: req.user.username,
        date: newCommit.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReadme = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    // 1️⃣ Find owner user
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repository
    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // 3️⃣ Find default branch
    const defaultBranch = await Branch.findOne({
      repo: repoDoc._id,
      name: repoDoc.defaultBranch,
    });
    if (!defaultBranch)
      return next(new AppError("Default branch not found", 404));

    // 4️⃣ Find latest commit on default branch
    const latestCommit = await Commit.findOne({ branch: defaultBranch._id })
      .sort({ createdAt: -1 })
      .populate("author", "username");

    if (!latestCommit)
      return next(new AppError("No commits found in this repository", 404));

    // 5️⃣ Find README file in root directory
    const readmeFile = await File.findOne({
      repository: repoDoc._id,
      commit: latestCommit._id,
      path: /^README(\.md|\.txt|\.rst)?$/i, // regex to match README, README.md, README.TXT, etc.
    });

    if (!readmeFile)
      return next(
        new AppError("README file not found in this repository", 404)
      );

    // 6️⃣ Return README content
    res.status(200).json({
      success: true,
      repo: `${owner}/${repo}`,
      ref: repoDoc.defaultBranch,
      commit: {
        hash: latestCommit.hash,
        message: latestCommit.message,
        author: latestCommit.author?.username,
        date: latestCommit.createdAt,
      },
      readme: {
        path: readmeFile.path,
        content: readmeFile.content,
        size: readmeFile.size,
        updatedAt: readmeFile.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getArchive = async (req, res, next) => {
  try {
    const { owner, repo, format } = req.params; // zip or tar
    const { ref } = req.query; // optional branch or commit hash

    if (!["zip", "tar"].includes(format.toLowerCase()))
      return next(
        new AppError("Invalid archive format. Use 'zip' or 'tar'.", 400)
      );

    // 1️⃣ Find owner user
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repository
    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // 3️⃣ Determine commit
    let commit;
    if (ref) {
      const branch = await Branch.findOne({ repo: repoDoc._id, name: ref });
      if (branch) {
        commit = await Commit.findOne({ branch: branch._id }).sort({
          createdAt: -1,
        });
      } else {
        commit = await Commit.findOne({ repo: repoDoc._id, hash: ref });
      }
      if (!commit)
        return next(new AppError("No commit found for provided ref", 404));
    } else {
      const defaultBranch = await Branch.findOne({
        repo: repoDoc._id,
        name: repoDoc.defaultBranch,
      });
      if (!defaultBranch)
        return next(new AppError("Default branch not found", 404));
      commit = await Commit.findOne({ branch: defaultBranch._id }).sort({
        createdAt: -1,
      });
      if (!commit)
        return next(new AppError("No commits found in this repository", 404));
    }

    // 4️⃣ Get all files and directories for the commit
    const files = await File.find({
      repository: repoDoc._id,
      commit: commit._id,
    });

    // 5️⃣ Set response headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${repo}-${commit.hash}.${format}`
    );
    res.setHeader(
      "Content-Type",
      format === "zip" ? "application/zip" : "application/x-tar"
    );

    // 6️⃣ Create archive
    const archive = archiver(format, { zlib: { level: 9 } });
    archive.pipe(res);

    // 7️⃣ Add directories first
    files
      .filter((f) => f.type === "dir")
      .forEach((dir) => {
        // archiver creates folders automatically if we append a trailing slash
        archive.append("", {
          name: dir.path.endsWith("/") ? dir.path : dir.path + "/",
        });
      });

    // 8️⃣ Add files with paths (nested structure preserved)
    files
      .filter((f) => f.type === "file")
      .forEach((file) => {
        archive.append(file.content || "", { name: file.path });
      });

    await archive.finalize();
  } catch (err) {
    next(err);
  }
};

export const getRepoTree = async (req, res, next) => {
  try {
    const { owner, repo, sha } = req.params; // sha or branch name

    // 1️⃣ Find owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repository
    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // 3️⃣ Find commit by SHA or branch name
    let commit;
    const branch = await Branch.findOne({ repo: repoDoc._id, name: sha });
    if (branch) {
      commit = await Commit.findOne({ branch: branch._id }).sort({
        createdAt: -1,
      });
    } else {
      commit = await Commit.findOne({ repo: repoDoc._id, hash: sha });
    }

    if (!commit) return next(new AppError("Commit not found", 404));

    // 4️⃣ Fetch all files for the commit
    const files = await File.find({
      repository: repoDoc._id,
      commit: commit._id,
    });

    // 5️⃣ Build tree recursively
    const buildTree = (files) => {
      const tree = {};

      files.forEach((file) => {
        const parts = file.path.split("/"); // split path into segments
        let current = tree;

        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = {
              type: index === parts.length - 1 ? file.type : "dir",
              children: index === parts.length - 1 ? null : {},
            };
          }
          if (current[part].children) current = current[part].children;
        });
      });

      return tree;
    };

    const tree = buildTree(files);

    res.status(200).json({
      success: true,
      repo: `${owner}/${repo}`,
      commit: {
        hash: commit.hash,
        message: commit.message,
        date: commit.createdAt,
      },
      tree,
    });
  } catch (err) {
    next(err);
  }
};

export const getFileByBlob = async (req, res, next) => {
  try {
    const { owner, repo, sha } = req.params;

    // 1️⃣ Find owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repository
    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // 3️⃣ Find file by blob SHA
    console.log("Searching for SHA:", req.params.sha);
    const file = await File.findOne({ hash: req.params.sha });
    console.log("Found file:", file);
    if (!file)
      return next(
        new AppError("File not found for the provided blob SHA", 404)
      );

    res.status(200).json({
      success: true,
      repo: `${owner}/${repo}`,
      file: {
        path: file.path,
        type: file.type,
        size: file.size,
        content: file.content,
        updatedAt: file.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getFileCommitHistory = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    // ✅ Use query param OR fallback to param
    const filePath = decodeURIComponent(req.query.path || req.params.path);

    // 1️⃣ Find owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repository
    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // 3️⃣ Find file by path (look up all commits associated with it)
    const fileDocs = await File.find({
      repository: repoDoc._id,
      path: filePath,
    })
      .populate("commit", "hash message author createdAt")
      .sort({ createdAt: -1 });

    if (!fileDocs || fileDocs.length === 0)
      return next(new AppError("No commits found for this file", 404));

    // 4️⃣ Build commit history
    const history = fileDocs.map((file) => ({
      commitHash: file.commit?.hash,
      message: file.commit?.message,
      author: file.commit?.author,
      date: file.commit?.createdAt,
      fileSize: file.size,
      blobSHA: file.hash,
    }));

    // 5️⃣ Return commit history
    res.status(200).json({
      success: true,
      repo: `${owner}/${repo}`,
      file: filePath,
      totalCommits: history.length,
      commits: history,
    });
  } catch (err) {
    next(err);
  }
};

export const compareCommitsOrBranches = async (req, res, next) => {
  try {
    const { owner, repo, base, head } = req.params;

    // 1️⃣ Find owner
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser) return next(new AppError("Owner not found", 404));

    // 2️⃣ Find repository
    const repoDoc = await Repository.findOne({
      owner: ownerUser._id,
      name: repo,
    });
    if (!repoDoc) return next(new AppError("Repository not found", 404));

    // 3️⃣ Resolve base and head to commit hashes
    const resolveCommit = async (ref) => {
      // check if it's a branch name
      const branch = await Branch.findOne({ repo: repoDoc._id, name: ref });
      if (branch) {
        const latestCommit = await Commit.findOne({ branch: branch._id })
          .sort({ createdAt: -1 })
          .lean();
        return latestCommit?.hash;
      }

      // otherwise assume it’s a commit hash
      const commit = await Commit.findOne({ repo: repoDoc._id, hash: ref });
      return commit?.hash;
    };

    const baseHash = await resolveCommit(base);
    const headHash = await resolveCommit(head);

    if (!baseHash || !headHash)
      return next(
        new AppError(
          "Invalid base or head reference (branch or commit not found)",
          404
        )
      );

    // 4️⃣ Get commit documents
    const baseCommit = await Commit.findOne({
      repo: repoDoc._id,
      hash: baseHash,
    });
    const headCommit = await Commit.findOne({
      repo: repoDoc._id,
      hash: headHash,
    });

    // 5️⃣ Get file sets for each commit
    const baseFiles = await File.find({ commit: baseCommit._id }).lean();
    const headFiles = await File.find({ commit: headCommit._id }).lean();

    // 6️⃣ Compare files
    const diffs = [];

    // Build maps
    const baseMap = new Map(baseFiles.map((f) => [f.path, f]));
    const headMap = new Map(headFiles.map((f) => [f.path, f]));

    // Files added or modified
    for (const [path, headFile] of headMap) {
      const baseFile = baseMap.get(path);
      if (!baseFile) {
        diffs.push({ path, status: "added" });
      } else if (baseFile.hash !== headFile.hash) {
        diffs.push({ path, status: "modified" });
      }
    }

    // Files deleted
    for (const [path, baseFile] of baseMap) {
      if (!headMap.has(path)) {
        diffs.push({ path, status: "deleted" });
      }
    }

    // 7️⃣ Response
    res.status(200).json({
      success: true,
      repo: `${owner}/${repo}`,
      base: { ref: base, hash: baseHash },
      head: { ref: head, hash: headHash },
      totalChanges: diffs.length,
      changes: diffs,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  listRepoFiles,
  getFileContent,
  uploadOrUpdateFile,
  deleteFile,
  getReadme,
  getArchive,
  getRepoTree,
  getFileByBlob,
  getFileCommitHistory,
  compareCommitsOrBranches,
};
