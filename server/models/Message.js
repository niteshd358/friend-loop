import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    attachmentUrl: { type: String, default: "" },
    attachmentType: { type: String, default: "" },
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
