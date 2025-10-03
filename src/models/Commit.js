import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const CommitSchema = new Schema(
  {
    repo: {
      type: Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    branch: { type: Types.ObjectId, ref: "Branch", required: true },
    author: { type: Types.ObjectId, ref: "User", required: true },
    message: { type: String },
    hash: { type: String, required: true, index: true },
    parents: [{ type: String }],
    files: [{ path: String, action: String }],
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CommitSchema.index({ repo: 1, hash: 1 }, { unique: true });

export default mongoose.model("Commit", CommitSchema);
