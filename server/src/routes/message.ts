import express, { Request, Response } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { uploadCloudinary } from "../config/cloudinary.js";
import {
  sendMessage,
  getMessages,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/:chatId", authMiddleware, getMessages);
router.post("/", authMiddleware, sendMessage);
router.post("/upload", authMiddleware, uploadCloudinary.single("attachment"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    let attachmentType = "file";
    if (req.file.mimetype.startsWith("image/")) {
      attachmentType = "image";
    }

    res.json({
      msg: "File uploaded successfully 📎",
      attachmentUrl: req.file.path, // Cloudinary URL
      attachmentType,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
