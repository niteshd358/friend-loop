import { Response } from "express";
import User from "../models/User.js";
import { isValidObjectId } from "../middleware/validate.js";

// GET /api/profile/:id
export const getProfile = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    const isOwnProfile = req.user && req.user.id === id;

    // Access Control & Privacy: If viewing someone else's profile, hide sensitive fields (email, dob, gender)
    const selectFields = isOwnProfile
      ? "username email firstName lastName dob gender profileImage isVerified createdAt lastSeen"
      : "username firstName lastName profileImage createdAt lastSeen";

    const user = await User.findById(id).select(selectFields);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/profile/update
export const updateProfile = async (req: any, res: Response) => {
  try {
    const { firstName, lastName, dob, gender } = req.body as any;
    let profileImage = undefined;

    if (req.file) {
      // Cloudinary returns the secure URL in req.file.path
      profileImage = req.file.path;
    }

    const updates: any = {};
    if (typeof firstName === "string") updates.firstName = firstName.trim();
    if (typeof lastName === "string") updates.lastName = lastName.trim();
    if (dob) updates.dob = new Date(dob);
    if (gender && ["male", "female", "other"].includes(gender)) updates.gender = gender;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("-password -verificationCode -resetPasswordToken -resetPasswordExpires");

    res.json({ msg: "Profile updated successfully", user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
