import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import authMiddleware from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
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
  max: 15,
  skip: () => process.env.NODE_ENV === "test",
  message: { msg: "Too many authentication attempts from this IP, please try again after 15 minutes" },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: () => process.env.NODE_ENV === "test",
  message: { msg: "Too many token refresh attempts, please try again later" },
});

const signupSchema = z.object({
  username: z.string().trim().min(3).max(30),
  email: z.string().trim().email(),
  password: z.string().min(6),
  publicKey: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
  publicKey: z.string().optional(),
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
router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/demo", authLimiter, demoLogin);
router.get("/refresh", refreshLimiter, refresh);
router.get("/profile", authMiddleware, getProfile);
router.post("/logout", authMiddleware, logout);
router.put("/profile/update", authMiddleware, updateProfile);
router.delete("/profile/delete", authMiddleware, deleteAccount);
router.get("/me", getMe);

export default router;
