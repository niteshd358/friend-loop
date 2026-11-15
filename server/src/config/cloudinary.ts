import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Request, Response, NextFunction } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
]);

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const uploadDisk = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Allowed formats: JPEG, PNG, WEBP, GIF, PDF, TXT"));
    }
  },
});

export const uploadCloudinary = {
  single: (fieldName: string) => {
    const handler = uploadDisk.single(fieldName);
    return (req: Request, res: Response, next: NextFunction) => {
      handler(req, res, async (err: any) => {
        if (err) {
          return next(err);
        }
        if (!req.file) {
          return next();
        }

        const isCloudinaryConfigured = Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET &&
          process.env.CLOUDINARY_CLOUD_NAME !== "demo"
        );

        if (isCloudinaryConfigured) {
          try {
            const isImage = req.file.mimetype.startsWith("image/");
            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
              folder: "friendloop",
              resource_type: isImage ? "image" : "raw",
            });

            // Clean up temporary local disk file after successful CDN upload
            try {
              fs.unlinkSync(req.file.path);
            } catch {
              // ignore deletion error
            }

            req.file.path = uploadResult.secure_url;
            return next();
          } catch (cloudErr: any) {
            console.warn(
              `[Cloudinary] Upload failed (${cloudErr.message}), falling back to local storage.`
            );
            // Fallback: keep local file in uploads/ and set accessible URL path
            req.file.path = `/uploads/${req.file.filename}`;
            return next();
          }
        } else {
          // Local storage URL
          req.file.path = `/uploads/${req.file.filename}`;
          return next();
        }
      });
    };
  },
};

export default cloudinary;
