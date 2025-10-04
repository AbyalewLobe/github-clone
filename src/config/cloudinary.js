import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config(); // <-- Add this line at the top if not present

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
