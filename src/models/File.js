import mongoose from "mongoose";
const { Schema } = mongoose;

const fileSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    commit: { type: Schema.Types.ObjectId, ref: "Commit", required: true },
    path: { type: String, required: true },
    content: { type: String },
    size: { type: Number, default: 0 },
    type: { type: String, enum: ["file", "dir"], default: "file" },
    hash: { type: String },
  },
  { timestamps: true }
);

fileSchema.index({ repository: 1, path: 1, commit: 1 }, { unique: true });

// ✅ Check if model exists before creating
export default mongoose.models.File || mongoose.model("File", fileSchema);
