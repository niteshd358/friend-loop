import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    // 1-to-1 chat (two members). You can extend to groups later.
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    lastMessage: { type: String },
  },
  { timestamps: true }
);

// helpful index for fetching user’s chats
chatSchema.index({ members: 1 });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
