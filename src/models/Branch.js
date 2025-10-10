import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const BranchSchema = new Schema(
  {
    repo: {
      type: Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    latestCommit: { type: Types.ObjectId, ref: "Commit", default: null }, // track latest commit
    headSha: { type: String }, // optional, can store commit hash
    protected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BranchSchema.index({ repo: 1, name: 1 }, { unique: true });

export default mongoose.model("Branch", BranchSchema);
