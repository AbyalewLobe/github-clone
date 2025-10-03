import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const OrgMemberSchema = new Schema(
  {
    org: {
      type: Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
  },
  { timestamps: true }
);

OrgMemberSchema.index({ org: 1, user: 1 }, { unique: true });

export default mongoose.model("OrgMember", OrgMemberSchema);
