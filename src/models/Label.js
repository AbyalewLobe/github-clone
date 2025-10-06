import mongoose from "mongoose";
const { Schema } = mongoose;

const labelSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    name: { type: String, required: true },
    color: { type: String, default: "#cccccc" },
    description: { type: String },
  },
  { timestamps: true }
);

labelSchema.index({ repository: 1, name: 1 }, { unique: true });

export default mongoose.model("Label", labelSchema);
