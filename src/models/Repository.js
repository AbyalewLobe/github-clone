import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const RepositorySchema = new Schema(
  {
    name: { type: String, required: true },
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    description: { type: String },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    defaultBranch: { type: String, default: "main" },
    collaborators: [{ type: Types.ObjectId, ref: "User" }],
    collaboratorsMeta: [
      {
        user: { type: Types.ObjectId, ref: "User" },
        permission: { type: String, enum: ["read", "write", "admin"] },
      },
    ],
    starsCount: { type: Number, default: 0 },
    forksCount: { type: Number, default: 0 },
    isFork: { type: Boolean, default: false },
    forkFrom: { type: Types.ObjectId, ref: "Repository" },
  },
  { timestamps: true }
);

RepositorySchema.index({ owner: 1, name: 1 }, { unique: true });

export default mongoose.model("Repository", RepositorySchema);
