import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    pullRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PullRequest",
      required: true,
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    state: {
      type: String,
      enum: ["approved", "changes_requested", "comment"],
      required: true,
    },
    comment: { type: String },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", ReviewSchema);
export default Review;
