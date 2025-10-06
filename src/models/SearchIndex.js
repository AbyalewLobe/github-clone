import mongoose from "mongoose";
const { Schema } = mongoose;

const searchIndexSchema = new Schema(
  {
    type: { type: String, enum: ["user", "repo", "org"], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    keywords: { type: [String], index: true },
  },
  { timestamps: true }
);

searchIndexSchema.index({ type: 1, keywords: 1 });

export default mongoose.model("SearchIndex", searchIndexSchema);
