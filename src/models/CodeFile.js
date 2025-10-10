import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const CodeFileSchema = new Schema(
  {
    repo: { type: Types.ObjectId, ref: "Repository", required: true },
    filename: { type: String, required: true },
    path: { type: String, default: "" }, // folder path
    language: { type: String },
    content: { type: String }, // the code content
  },
  { timestamps: true }
);

// Text index on content for search
CodeFileSchema.index({ content: "text", filename: "text", path: "text" });

export default mongoose.model("CodeFile", CodeFileSchema);
