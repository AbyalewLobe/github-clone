import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const ForkSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true },
    originalRepo: { type: Types.ObjectId, ref: "Repository", required: true },
    forkedRepo: { type: Types.ObjectId, ref: "Repository", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Fork", ForkSchema);
