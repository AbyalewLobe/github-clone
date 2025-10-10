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
    message: { type: String, required: true },
    hash: { type: String, required: true, index: true },
    parents: [{ type: Types.ObjectId, ref: "Commit" }], // references to parent commits
    files: [
      {
        path: { type: String },
        action: { type: String, enum: ["added", "modified", "deleted"] },
        hash: { type: String }, // optional file hash at this commit
      },
    ],
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CommitSchema.index({ repo: 1, hash: 1 }, { unique: true });

export default mongoose.models.Commit || mongoose.model("Commit", CommitSchema);
