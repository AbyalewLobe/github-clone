import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const PullRequestSchema = new Schema(
  {
    repo: {
      type: Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    number: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    author: { type: Types.ObjectId, ref: "User", required: true },
    sourceBranch: { type: Types.ObjectId, ref: "Branch", required: true },
    targetBranch: { type: Types.ObjectId, ref: "Branch", required: true },
    headSha: { type: String },
    baseSha: { type: String },
    status: {
      type: String,
      enum: ["open", "closed", "merged"],
      default: "open",
    },
    reviewers: [{ type: Types.ObjectId, ref: "User" }],
    mergeCommitSha: { type: String },
    isDraft: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PullRequestSchema.index({ repo: 1, number: 1 }, { unique: true });
PullRequestSchema.index({ title: "text", description: "text" });

export default mongoose.model("PullRequest", PullRequestSchema);
