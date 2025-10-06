import mongoose from "mongoose";
const { Schema } = mongoose;

const webhookSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    url: { type: String, required: true },
    events: [
      {
        type: String,
        enum: ["push", "pull_request", "issues", "release"],
      },
    ],
    active: { type: Boolean, default: true },
    secret: { type: String },
    lastDelivered: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Webhook", webhookSchema);
