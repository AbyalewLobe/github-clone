import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const FollowerSchema = new Schema(
  {
    follower: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    following: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

FollowerSchema.index({ follower: 1, following: 1 }, { unique: true });

export default mongoose.model("Follower", FollowerSchema);
