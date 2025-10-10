import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const ForkSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    originalRepo: { type: Types.ObjectId, ref: "Repository", required: true, index: true },
    forkedRepo: { type: Types.ObjectId, ref: "Repository", required: true, index: true },
    
    forkName: { type: String }, // e.g. user can rename their fork
    isSynced: { type: Boolean, default: true }, // shows if up-to-date with source
    aheadBy: { type: Number, default: 0 }, // number of commits ahead
    behindBy: { type: Number, default: 0 }, // number of commits behind
  },
  { timestamps: true }
);

ForkSchema.index({ user: 1, originalRepo: 1 }, { unique: true }); // prevent multiple forks of same repo

export default mongoose.model("Fork", ForkSchema);