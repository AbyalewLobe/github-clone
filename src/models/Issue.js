import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const IssueSchema = new Schema(
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
    assignees: [{ type: Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["open", "closed"], default: "open" },
    labels: [{ type: String }],
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

IssueSchema.index({ repo: 1, number: 1 }, { unique: true });

export default mongoose.model("Issue", IssueSchema);
