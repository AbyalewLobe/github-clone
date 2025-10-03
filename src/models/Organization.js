import mongoose from "mongoose";
const { Schema } = mongoose;

const OrgSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    avatarUrl: { type: String },
    billingInfo: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model("Organization", OrgSchema);
