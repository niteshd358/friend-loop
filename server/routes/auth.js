import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  signup,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  logout,
  updateProfile,
  deleteAccount,
  getMe,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", authMiddleware, getProfile);
router.post("/logout", authMiddleware, logout);
router.put("/profile/update", authMiddleware, updateProfile);
router.delete("/profile/delete", authMiddleware, deleteAccount);
router.get("/me", getMe);

export default router;
