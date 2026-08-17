import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getMessages, sendMessage, uploadMessageAttachment } from "../controllers/messageController.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for chat attachments
});

router.get("/:chatId", authMiddleware, getMessages);
router.post("/", authMiddleware, sendMessage);
router.post("/upload", authMiddleware, upload.single("attachment"), uploadMessageAttachment);

export default router;
