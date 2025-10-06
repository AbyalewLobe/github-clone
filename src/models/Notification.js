import mongoose from "mongoose";
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["issue", "pull_request", "comment", "star", "follow", "release"],
      required: true,
    },
    message: { type: String, required: true },
    link: { type: String }, // e.g. "/repo/owner/project/pull/5"
    read: { type: Boolean, default: false },
    actor: { type: Schema.Types.ObjectId, ref: "User" }, // who triggered it
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
