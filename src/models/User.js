import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, select: false }, // hide by default
    name: { type: String },
    bio: { type: String },
    avatarUrl: { type: String }, // ✅ Cloudinary image URL will be stored here
    role: { type: String, enum: ["user", "admin"], default: "user" },
    publicReposCount: { type: Number, default: 0 },
    location: { type: String },
    type: { type: String, enum: ["user", "organization"], default: "user" },
    settings: { type: Object },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationTokenExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    googleId: { type: String },
    authProvider: { type: String, default: "local" },
  },
  { timestamps: true }
);

UserSchema.index({ username: "text", name: "text", email: "text" });

export default mongoose.model("User", UserSchema);
