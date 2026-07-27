import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ msg: "Email already in use" });
    
    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ msg: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateOTP();

    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword,
      isVerified: true // Skipping OTP verification
    });
    
    await newUser.save();

    res.json({ msg: "User registered successfully! You can now log in.", email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });
    
    if (user.isVerified) return res.status(400).json({ msg: "Email is already verified" });
    
    if (user.verificationCode !== code) return res.status(400).json({ msg: "Invalid verification code" });
    
    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();
    
    res.json({ msg: "Email verified successfully! You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body; // 'email' field here can actually contain username or email

    // Search by either email or username
    const user = await User.findOne({
      $or: [{ email: email }, { username: email }]
    });
    
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "defaultsecret", { expiresIn: "7d" });

    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ msg: "No user found with this email" });
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Bypass email sending for development
    // Return token directly to the frontend
    res.json({ 
      msg: "Password reset authorized! Use this token to reset your password.",
      resetToken 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) return res.status(400).json({ msg: "Password reset token is invalid or has expired" });
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ msg: "Password has been successfully reset. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({
      user,
      msg: "Profile fetched successfully ✅",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const logout = (req, res) => {
  res.json({ msg: "User logged out successfully 🚪" });
};

export const updateProfile = async (req, res) => {
  try {
    const { username, email, password } = req.body;

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "defaultsecret");
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};
