import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  signup,
  login,
  getProfile,
  logout,
  updateProfile,
  deleteAccount,
  getMe,
  demoLogin,
  refresh
} from "../controllers/authController.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { msg: "Too many login attempts, please try again later." }
});

const router = express.Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/demo", authLimiter, demoLogin);
router.get("/refresh", refresh);
router.get("/profile", authMiddleware, getProfile);
router.post("/logout", authMiddleware, logout);
router.put("/profile/update", authMiddleware, updateProfile);
router.delete("/profile/delete", authMiddleware, deleteAccount);
router.get("/me", getMe);

export default router;
