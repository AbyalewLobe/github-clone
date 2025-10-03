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
    headSha: { type: String },
    protected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BranchSchema.index({ repo: 1, name: 1 }, { unique: true });

export default mongoose.model("Branch", BranchSchema);
