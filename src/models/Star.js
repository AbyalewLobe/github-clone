import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const StarSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    repo: { type: Types.ObjectId, ref: "Repository", required: true, index: true },
    pinned: { type: Boolean, default: false }, // optional: allow user to "pin" favorites
  },
  { timestamps: true }
);

// Prevent duplicates
StarSchema.index({ user: 1, repo: 1 }, { unique: true });

export default mongoose.model("Star", StarSchema);