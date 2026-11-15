import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { Request, Response } from "express";

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "supersecretkey";
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || "supersecretrefreshkey";

export const generateTokens = (userId: string, tokenVersion = 0) => {
  const accessToken = jwt.sign(
    { id: userId, typ: "access" },
    getAccessSecret(),
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: userId, typ: "refresh", tokenVersion },
    getRefreshSecret(),
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, email, password, publicKey } = req.body as any;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ msg: "Username, email, and password must be valid non-empty strings" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) return res.status(400).json({ msg: "Email already in use" });

    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) return res.status(400).json({ msg: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      publicKey: typeof publicKey === "string" ? publicKey : "",
      tokenVersion: 0,
    });

    await newUser.save();

    res.json({ msg: "User registered successfully! You can now log in.", email: cleanEmail });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, publicKey } = req.body as any;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ msg: "Email/username and password must be valid strings" });
    }

    const cleanIdentifier = email.trim();

    // Safe query using primitive strings to prevent NoSQL operator injection
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { username: cleanIdentifier }
      ]
    });

    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    if (publicKey && typeof publicKey === "string") {
      user.publicKey = publicKey;
      await user.save();
    }

    const tokenVersion = user.tokenVersion || 0;
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), tokenVersion);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token: accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        publicKey: user.publicKey,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const demoLogin = async (req: Request, res: Response) => {
  try {
    const { default: Chat } = await import("../models/Chat.js");

    // Per-session ephemeral demo account to prevent sharing guest sessions between visitors
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const guestUsername = `Guest_${randomSuffix}`;
    const guestEmail = `guest_${Date.now()}_${randomSuffix}@demo.com`;
    const hashedPassword = await bcrypt.hash("demo123", 10);

    const guestUser = await User.create({
      username: guestUsername,
      email: guestEmail,
      password: hashedPassword,
      firstName: "Guest",
      lastName: "User",
      tokenVersion: 0,
      publicKey: typeof req.body?.publicKey === "string" ? req.body.publicKey : "",
    });

    let botUser = await User.findOne({ email: "bot@demo.com" });
    if (!botUser) {
      const botHashedPassword = await bcrypt.hash("bot123", 10);
      botUser = await User.create({
        username: "Echo Bot",
        email: "bot@demo.com",
        password: botHashedPassword,
        firstName: "Echo",
        lastName: "Bot",
      });
    }

    // Create a dedicated isolated chat with Echo Bot for this guest session
    await Chat.create({ members: [guestUser._id, botUser._id] });

    const { accessToken, refreshToken } = generateTokens(guestUser._id.toString(), 0);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token: accessToken,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        email: guestUser.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        publicKey: user.publicKey,
      },
      msg: "Profile fetched successfully ✅",
    });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const logout = async (req: any, res: Response) => {
  try {
    if (req.user?.id) {
      // Invalidate existing refresh tokens upon explicit logout
      await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    }
  } catch (e) {
    // Continue clearing cookie
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  res.json({ msg: "User logged out successfully 🚪" });
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const { username, email, password } = req.body as any;

    const updates: any = {};
    if (typeof username === "string" && username.trim()) updates.username = username.trim();
    if (typeof email === "string" && email.trim()) updates.email = email.trim().toLowerCase();
    if (typeof password === "string" && password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.json({
      user: updatedUser,
      msg: "Profile updated successfully ✨",
    });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const deleteAccount = async (req: any, res: Response) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);
    if (!deletedUser) {
      return res.status(404).json({ msg: "User not found ❌" });
    }
    res.clearCookie("refreshToken", { path: "/" });
    res.json({ msg: "Account deleted successfully 🗑️" });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ msg: "No token" });

    const decoded = jwt.verify(token, getAccessSecret()) as any;
    if (decoded.typ && decoded.typ !== "access") {
      return res.status(401).json({ msg: "Invalid token type" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(401).json({ msg: "Invalid or expired token" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ msg: "No refresh token" });

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, getRefreshSecret());
    } catch (tokenErr) {
      return res.status(401).json({ msg: "Invalid or expired refresh token" });
    }

    if (decoded.typ !== "refresh") {
      return res.status(401).json({ msg: "Invalid token type" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ msg: "User not found" });

    // Reuse detection: If tokenVersion does not match, all refresh tokens have been compromised/reused
    if (user.tokenVersion !== decoded.tokenVersion) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      res.clearCookie("refreshToken", { path: "/" });
      return res.status(401).json({ msg: "Refresh token has been revoked" });
    }

    // Token rotation: increment tokenVersion for the new refresh token
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString(), user.tokenVersion);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: accessToken });
  } catch (err) {
    res.status(401).json({ msg: "Invalid refresh token" });
  }
};
