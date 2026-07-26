import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getMessages, sendMessage } from "../controllers/messageController.js";

const router = express.Router();

router.get("/:chatId", authMiddleware, getMessages);
router.post("/", authMiddleware, sendMessage);

export default router;
