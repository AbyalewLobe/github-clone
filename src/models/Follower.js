import mongoose from "mongoose";
const { Schema } = mongoose;

const fileSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    commit: { type: Schema.Types.ObjectId, ref: "Commit", required: true }, // each file tied to a commit
    path: { type: String, required: true }, // e.g. "src/index.js"
    content: { type: String }, // raw file content
    size: { type: Number, default: 0 },
    type: { type: String, enum: ["file", "dir"], default: "file" },
    hash: { type: String }, // SHA of content
  },
  { timestamps: true }
);

fileSchema.index({ repository: 1, path: 1, commit: 1 }, { unique: true });

export default mongoose.model("File", fileSchema);
