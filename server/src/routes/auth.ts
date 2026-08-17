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
  max: 10,
  message: { msg: "Too many attempts from this IP, please try again after 15 minutes" },
});

const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               publicKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
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
