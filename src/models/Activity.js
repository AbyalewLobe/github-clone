import mongoose from "mongoose";
const { Schema } = mongoose;

const activitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "created_repo",
        "starred_repo",
        "forked_repo",
        "opened_issue",
        "opened_pr",
        "commented",
        "joined_org",
      ],
      required: true,
    },
    targetRepo: { type: Schema.Types.ObjectId, ref: "Repository" },
    targetUser: { type: Schema.Types.ObjectId, ref: "User" },
    meta: { type: Object }, // any additional info
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);
