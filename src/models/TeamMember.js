import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const TeamMemberSchema = new Schema(
  {
    team: { type: Types.ObjectId, ref: "Team", required: true, index: true },
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["maintainer", "member"], default: "member" },
  },
  { timestamps: true }
);

TeamMemberSchema.index({ team: 1, user: 1 }, { unique: true });

export default mongoose.model("TeamMember", TeamMemberSchema);
