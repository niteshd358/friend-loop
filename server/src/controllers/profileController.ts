// @ts-nocheck
import User from "../models/User.js";

// GET /api/profile/:id
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "username email firstName lastName dob profileImage isVerified createdAt"
    );
    
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

// PUT /api/profile/update
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, dob, gender } = req.body as any;
    let profileImage = undefined;

    if (req.file) {
      // Cloudinary returns the secure URL in req.file.path
      profileImage = req.file.path;
    }

    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (dob !== undefined) updates.dob = dob;
    if (gender !== undefined) updates.gender = gender;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("-password -verificationCode -resetPasswordToken -resetPasswordExpires");

    res.json({ msg: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};
