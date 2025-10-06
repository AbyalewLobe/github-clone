import mongoose from "mongoose";
const { Schema } = mongoose;

const fileSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    path: { type: String, required: true }, // e.g. "src/index.js"
    content: { type: String }, // optional: raw file content
    size: { type: Number, default: 0 },
    type: { type: String, enum: ["file", "dir"], default: "file" },
    commit: { type: Schema.Types.ObjectId, ref: "Commit" },
    hash: { type: String }, // sha or hash of file content
  },
  { timestamps: true }
);

fileSchema.index({ repository: 1, path: 1 }, { unique: true });

export default mongoose.model("File", fileSchema);
