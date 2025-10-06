import mongoose from "mongoose";
const { Schema } = mongoose;

const releaseSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    tag: { type: String, required: true }, // e.g. "v1.0.0"
    title: { type: String },
    description: { type: String },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assets: [
      {
        name: String,
        url: String,
        size: Number,
      },
    ],
    draft: { type: Boolean, default: false },
    prerelease: { type: Boolean, default: false },
  },
  { timestamps: true }
);

releaseSchema.index({ repository: 1, tag: 1 }, { unique: true });

export default mongoose.model("Release", releaseSchema);
