import { Response } from "express";
import Chat from "../models/Chat.js";
import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import { isValidObjectId } from "../middleware/validate.js";

export const ensureChat = async (req: any, res: Response) => {
  try {
    const me = req.user.id;
    const { otherId } = req.body as any;

    if (!isValidObjectId(otherId)) {
      return res.status(400).json({ msg: "Valid otherId is required" });
    }
    if (otherId === me) {
      return res.status(400).json({ msg: "Cannot create a chat with yourself" });
    }

    let chat = await Chat.findOne({
      members: { $all: [me, otherId], $size: 2 },
    });

    if (chat) {
      return res.json(chat);
    }

    // Access Control (IDOR): Ensure friendship exists before creating a new chat
    const friendship = await FriendRequest.findOne({
      $or: [
        { sender: me, receiver: otherId, status: "accepted" },
        { sender: otherId, receiver: me, status: "accepted" },
      ],
    });

    const otherUser = await User.findById(otherId);
    if (!otherUser) {
      return res.status(404).json({ msg: "Target user not found" });
    }

    const isEchoBot = otherUser.email === "bot@demo.com";

    if (!friendship && !isEchoBot) {
      return res.status(403).json({ msg: "Forbidden: You must be friends with this user to start a chat" });
    }

    chat = await Chat.create({ members: [me, otherId] });

    try {
      const { getIO } = await import("../socket.js");
      const io = getIO();
      io.to(me).emit("chat:created");
      io.to(otherId).emit("chat:created");
    } catch {}

    res.json(chat);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyChats = async (req: any, res: Response) => {
  try {
    const me = req.user.id;
    let chats: any = await Chat.find({ members: me })
      // Privacy: Do not expose email in chat members list
      .populate("members", "username firstName lastName profileImage lastSeen")
      .sort({ updatedAt: -1 })
      .lean();

    const { getOnlineUsers } = await import("../socket.js");
    const onlineUsers = getOnlineUsers();

    chats = chats.map((chat: any) => {
      chat.members = chat.members.map((m: any) => ({
        ...m,
        isOnline: onlineUsers.has(m._id.toString()),
      }));
      return chat;
    });

    res.json(chats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
