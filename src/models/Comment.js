import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const CommentSchema = new Schema(
  {
    author: { type: Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    parentKind: {
      type: String,
      enum: ["Issue", "PullRequest", "Commit"],
      required: true,
    },
    parentId: { type: Types.ObjectId, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", CommentSchema);
