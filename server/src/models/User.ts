import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    dob: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    profileImage: { type: String, default: "" },
    lastSeen: {
      type: Number,
      default: Date.now,
    },
    publicKey: {
      type: String, // For E2E Encryption
    }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
