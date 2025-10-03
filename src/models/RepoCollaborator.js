import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const RepoCollaboratorSchema = new Schema(
  {
    repo: {
      type: Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    permission: {
      type: String,
      enum: ["read", "write", "admin"],
      default: "read",
    },
  },
  { timestamps: true }
);

RepoCollaboratorSchema.index({ repo: 1, user: 1 }, { unique: true });

export default mongoose.model("RepoCollaborator", RepoCollaboratorSchema);
