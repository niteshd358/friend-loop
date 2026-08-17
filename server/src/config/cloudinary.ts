import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "demo",
  api_secret: process.env.CLOUDINARY_API_SECRET || "demo",
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Basic setup for general files
    // If it's an image, let cloudinary optimize it. Otherwise, upload as raw.
    const isImage = file.mimetype.startsWith("image/");
    return {
      folder: "friendloop",
      resource_type: isImage ? "image" : "raw",
    };
  },
});

export const uploadCloudinary = multer({ storage });
export default cloudinary;
