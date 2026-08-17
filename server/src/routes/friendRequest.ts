import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  searchUsers,
  sendRequest,
  getIncomingRequests,
  respondRequest,
  removeFriend
} from "../controllers/friendRequestController.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get("/search", searchUsers);
router.post("/send", sendRequest);
router.get("/incoming", getIncomingRequests);
router.post("/respond", respondRequest);
router.post("/remove", removeFriend);

export default router;
