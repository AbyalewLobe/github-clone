import User from "../models/User.js";
import Repository from "../models/Repository.js";
import Issue from "../models/Issue.js";
import PullRequest from "../models/PullRequest.js";
import CodeFile from "../models/CodeFile.js";
import Commit from "../models/Commit.js";
import { successResponse } from "../utils/response.js";
import AppError from "../utils/appError.js";

export const searchUsers = async (req, res) => {
  try {
    const {
      q,
      repos,
      followers,
      location,
      type,
      sort = "followers",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (q) query.$text = { $search: q };
    if (location) query.location = new RegExp(location, "i");
    if (type) query.type = type;

    if (repos) query.publicReposCount = { $gte: Number(repos) };
    if (followers) query.followersCount = { $gte: Number(followers) }; 

    const sortOptions = {};
    sortOptions[sort === "joined" ? "createdAt" : sort] =
      order === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select("username name avatarUrl bio location type publicReposCount createdAt")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      results: users,
    });
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


export const searchRepositories = async (req, res) => {
  try {
    const {
      q,
      language,
      stars,
      fork,
      user,
      sort = "stars",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (q) query.$text = { $search: q };
    if (language) query.language = new RegExp(language, "i");
    if (fork) query.isFork = fork === "true";
    if (stars) query.starsCount = { $gte: Number(stars) };

    if (user) {
      const owner = await User.findOne({ username: user });
      if (owner) query.owner = owner._id;
      else return res.status(404).json({ success: false, message: "User not found" });
    }

    const sortOptions = {};
    const sortField =
      sort === "help-wanted-issues"
        ? "helpWantedIssues"
        : sort === "updated"
        ? "updatedAt"
        : sort === "forks"
        ? "forksCount"
        : "starsCount";
    sortOptions[sortField] = order === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const repos = await Repository.find(query)
      .populate("owner", "username avatarUrl")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Repository.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      results: repos,
    });
  } catch (err) {
    console.error("Error searching repositories:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const searchIssues = async (req, res) => {
  try {
    const {
      q,
      state,
      author,
      assignee,
      label,
      repo,
      sort = "created",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (q) query.$text = { $search: q };
    if (state) query.status = state.toLowerCase();
    if (label) query.labels = label;

    if (author) {
      const user = await User.findOne({ username: author });
      if (user) query.author = user._id;
      else return res.status(404).json({ success: false, message: "Author not found" });
    }

    if (assignee) {
      const user = await User.findOne({ username: assignee });
      if (user) query.assignees = user._id;
      else return res.status(404).json({ success: false, message: "Assignee not found" });
    }

    if (repo) {
      const [ownerName, repoName] = repo.split("/");
      const owner = await User.findOne({ username: ownerName });
      if (owner) {
        const repository = await Repository.findOne({
          owner: owner._id,
          name: repoName,
        });
        if (repository) query.repo = repository._id;
        else return res.status(404).json({ success: false, message: "Repository not found" });
      } else return res.status(404).json({ success: false, message: "Owner not found" });
    }

    const sortOptions = {};
    sortOptions[sort === "comments" ? "commentsCount" : sort] =
      order === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const issues = await Issue.find(query)
      .populate("author", "username avatarUrl")
      .populate("assignees", "username avatarUrl")
      .populate({
        path: "repo",
        select: "name owner",
        populate: { path: "owner", select: "username" },
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Issue.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      results: issues,
    });
  } catch (err) {
    console.error("Error searching issues:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


export const searchPullRequests = async (req, res) => {
  try {
    const {
      q,
      state,
      author,
      reviewer,
      repo,
      sort = "created",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (q) query.$text = { $search: q };
    if (state) query.status = state.toLowerCase();

    if (author) {
      const user = await User.findOne({ username: author });
      if (user) query.author = user._id;
      else return res.status(404).json({ success: false, message: "Author not found" });
    }

    if (reviewer) {
      const user = await User.findOne({ username: reviewer });
      if (user) query.reviewers = user._id;
      else return res.status(404).json({ success: false, message: "Reviewer not found" });
    }

    if (repo) {
      const [ownerName, repoName] = repo.split("/");
      const owner = await User.findOne({ username: ownerName });
      if (owner) {
        const repository = await Repository.findOne({
          owner: owner._id,
          name: repoName,
        });
        if (repository) query.repo = repository._id;
        else return res.status(404).json({ success: false, message: "Repository not found" });
      } else return res.status(404).json({ success: false, message: "Owner not found" });
    }

    const sortOptions = {};
    sortOptions[sort === "comments" ? "commentsCount" : sort] =
      order === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const pulls = await PullRequest.find(query)
      .populate("author", "username avatarUrl")
      .populate("reviewers", "username avatarUrl")
      .populate({
        path: "repo",
        select: "name owner",
        populate: { path: "owner", select: "username" },
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PullRequest.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      results: pulls,
    });
  } catch (err) {
    console.error("Error searching pull requests:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const searchCode = async (req, res) => {
  try {
    const {
      q,
      filename,
      path,
      repo,
      language,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (q) query.$text = { $search: q };

    if (filename) query.filename = new RegExp(filename, "i");
    if (path) query.path = new RegExp(path, "i");
    if (language) query.language = new RegExp(language, "i");

    if (repo) {
      const [ownerName, repoName] = repo.split("/");
      const owner = await User.findOne({ username: ownerName });
      if (!owner)
        return res.status(404).json({ success: false, message: "Owner not found" });
      
      const repository = await Repository.findOne({ owner: owner._id, name: repoName });
      if (!repository)
        return res.status(404).json({ success: false, message: "Repository not found" });

      query.repo = repository._id;
    }

    const skip = (page - 1) * limit;

    const files = await CodeFile.find(query)
      .populate({
        path: "repo",
        select: "name owner",
        populate: { path: "owner", select: "username" },
      })
      .skip(skip)
      .limit(Number(limit));

    const total = await CodeFile.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      results: files,
    });
  } catch (err) {
    console.error("Error searching code:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const searchCommits = async (req, res, next) => {
  try {
    const {
      q,
      author,
      committer, 
      repo,
      hash,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (q) query.message = { $regex: q, $options: "i" };

    if (author) {
      const authorUser = await User.findOne({ username: author });
      if (!authorUser)
        return res.status(404).json({ success: false, message: "Author not found" });
      query.author = authorUser._id;
    }

    if (hash) query.hash = hash;

    if (repo) {
      const [ownerName, repoName] = repo.split("/");
      const owner = await User.findOne({ username: ownerName });
      if (!owner)
        return res.status(404).json({ success: false, message: "Owner not found" });

      const repository = await Repository.findOne({ owner: owner._id, name: repoName });
      if (!repository)
        return res.status(404).json({ success: false, message: "Repository not found" });

      query.repo = repository._id;
    }

    const skip = (page - 1) * limit;

    const commits = await Commit.find(query)
      .populate("author", "username name avatarUrl")
      .populate({
        path: "repo",
        select: "name owner",
        populate: { path: "owner", select: "username" },
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Commit.countDocuments(query);

    return res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      commits,
    });
  } catch (error) {
    next(error);
  }
};

export const searchAll = async (req, res, next) => {
  try {
    const {
      q = "",
      page = 1,
      limit = 10,
      type, // optional: user, repo, issue, pull, commit, code
    } = req.query;

    if (!q) return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });

    const skip = (page - 1) * limit;

    const results = {};

    // Search Users
    if (!type || type === "user") {
      const users = await User.find({ $text: { $search: q } })
        .select("username name email avatarUrl publicReposCount followersCount location type createdAt")
        .skip(skip)
        .limit(Number(limit));

      const totalUsers = await User.countDocuments({ $text: { $search: q } });
      results.users = { total: totalUsers, items: users };
    }

    // Search Repositories
    if (!type || type === "repo") {
      const repos = await Repository.find({ $text: { $search: q } })
        .populate("owner", "username name avatarUrl")
        .skip(skip)
        .limit(Number(limit));

      const totalRepos = await Repository.countDocuments({ $text: { $search: q } });
      results.repositories = { total: totalRepos, items: repos };
    }

    // Search Issues
    if (!type || type === "issue") {
      const issues = await Issue.find({ $text: { $search: q } })
        .populate("author", "username name avatarUrl")
        .populate("assignees", "username name avatarUrl")
        .populate({
          path: "repo",
          select: "name owner",
          populate: { path: "owner", select: "username" },
        })
        .skip(skip)
        .limit(Number(limit));

      const totalIssues = await Issue.countDocuments({ $text: { $search: q } });
      results.issues = { total: totalIssues, items: issues };
    }

    // Search Pull Requests
    if (!type || type === "pull") {
      const pulls = await PullRequest.find({ $text: { $search: q } })
        .populate("author", "username name avatarUrl")
        .populate("reviewers", "username name avatarUrl")
        .populate({
          path: "repo",
          select: "name owner",
          populate: { path: "owner", select: "username" },
        })
        .skip(skip)
        .limit(Number(limit));

      const totalPulls = await PullRequest.countDocuments({ $text: { $search: q } });
      results.pullRequests = { total: totalPulls, items: pulls };
    }

    // Search Commits
    if (!type || type === "commit") {
      const commits = await Commit.find({ message: { $regex: q, $options: "i" } })
        .populate("author", "username name avatarUrl")
        .populate({
          path: "repo",
          select: "name owner",
          populate: { path: "owner", select: "username" },
        })
        .skip(skip)
        .limit(Number(limit));

      const totalCommits = await Commit.countDocuments({ message: { $regex: q, $options: "i" } });
      results.commits = { total: totalCommits, items: commits };
    }

    // Search Code Files (optional)
    if (!type || type === "code") {
      const codeFiles = await CodeFile.find({ $text: { $search: q } })
        .populate({
          path: "repo",
          select: "name owner",
          populate: { path: "owner", select: "username" },
        })
        .skip(skip)
        .limit(Number(limit));

      const totalCode = await CodeFile.countDocuments({ $text: { $search: q } });
      results.codeFiles = { total: totalCode, items: codeFiles };
    }

    return successResponse(res, 200, {
      query: q,
      page: Number(page),
      limit: Number(limit),
      results,
    });
  } catch (error) {
    next(error);
  }
};

export default{
    searchUsers,
    searchIssues,
    searchPullRequests,
    searchRepositories,
    searchCode,
    searchCommits,
    searchAll
}