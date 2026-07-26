import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { ensureChat, getMyChats } from "../controllers/chatController.js";

const router = express.Router();

router.post("/ensure", authMiddleware, ensureChat);
router.get("/mine", authMiddleware, getMyChats);

export default router;
