import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const TeamSchema = new Schema(
  {
    org: {
      type: Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    repos: [{ type: Types.ObjectId, ref: "Repository" }],
  },
  { timestamps: true }
);

TeamSchema.index({ org: 1, name: 1 }, { unique: true });

export default mongoose.model("Team", TeamSchema);
