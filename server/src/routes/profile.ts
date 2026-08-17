import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { uploadCloudinary } from "../config/cloudinary.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/:id", getProfile);
// Assuming updateProfile handles req.file
router.put("/update", uploadCloudinary.single("profileImage"), updateProfile);

export default router;
