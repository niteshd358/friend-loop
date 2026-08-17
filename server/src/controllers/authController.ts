import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { Request, Response } from "express";

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: userId }, (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET) as string, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, email, password, publicKey } = req.body as any;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ msg: "Email already in use" });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ msg: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      publicKey
    });

    await newUser.save();

    res.json({ msg: "User registered successfully! You can now log in.", email });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, publicKey } = req.body as any; // 'email' field here can actually contain username or email

    // Search by either email or username
    const user = await User.findOne({
      $or: [{ email: email }, { username: email }]
    });

    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    if (publicKey) {
      user.publicKey = publicKey;
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: accessToken, user: { id: user._id, username: user.username, email: user.email, publicKey: user.publicKey } });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const demoLogin = async (req, res) => {
  try {
    const { default: Chat } = await import("../models/Chat.js");

    let guestUser = await User.findOne({ email: "guest@demo.com" });
    if (!guestUser) {
      const hashedPassword = await bcrypt.hash("demo123", 10);
      guestUser = await User.create({
        username: "Guest User",
        email: "guest@demo.com",
        password: hashedPassword,
        firstName: "Guest",
        lastName: "User"
      });
    }

    let botUser = await User.findOne({ email: "bot@demo.com" });
    if (!botUser) {
      const hashedPassword = await bcrypt.hash("bot123", 10);
      botUser = await User.create({
        username: "Echo Bot",
        email: "bot@demo.com",
        password: hashedPassword,
        firstName: "Echo",
        lastName: "Bot"
      });
    }

    let chat = await Chat.findOne({
      members: { $all: [guestUser._id, botUser._id], $size: 2 },
    });
    if (!chat) {
      await Chat.create({ members: [guestUser._id, botUser._id] });
    }

    const { accessToken, refreshToken } = generateTokens(guestUser._id.toString());

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: accessToken, user: { id: guestUser._id, username: guestUser.username, email: guestUser.email } });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        publicKey: user.publicKey
      },
      msg: "Profile fetched successfully ✅",
    });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("refreshToken");
  res.json({ msg: "User logged out successfully 🚪" });
};

export const updateProfile = async (req, res) => {
  try {
    const { username, email, password } = req.body as any;

    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.password = hashedPassword;
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

export const deleteAccount = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);
    if (!deletedUser) {
      return res.status(404).json({ msg: "User not found ❌" });
    }
    res.json({ msg: "Account deleted successfully 🗑️" });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const getMe = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ msg: "No refresh token" });

    const decoded = jwt.verify(refreshToken, (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET) as string) as any;
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ msg: "Invalid refresh token" });

    const { accessToken } = generateTokens(user._id.toString());

    res.json({ token: accessToken });
  } catch (err) {
    res.status(401).json({ msg: "Invalid refresh token" });
  }
};
