// @ts-nocheck
import Chat from "../models/Chat.js";

export const ensureChat = async (req, res) => {
  try {
    const me = req.user.id;
    const { otherId } = req.body as any;
    if (!otherId) return res.status(400).json({ msg: "otherId is required" });
    if (otherId === me) return res.status(400).json({ msg: "Cannot chat with yourself" });

    let chat = await Chat.findOne({
      members: { $all: [me, otherId], $size: 2 },
    });

    if (!chat) {
      chat = await Chat.create({ members: [me, otherId] });
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};

export const getMyChats = async (req, res) => {
  try {
    const me = req.user.id;
    let chats = await Chat.find({ members: me })
      .populate("members", "username email firstName lastName profileImage lastSeen")
      .sort({ updatedAt: -1 })
      .lean();

    const { getOnlineUsers } = await import("../socket.js");
    const onlineUsers = getOnlineUsers();

    chats = chats.map(chat => {
      chat.members = chat.members.map(m => ({
        ...m,
        isOnline: onlineUsers.has(m._id.toString())
      }));
      return chat;
    });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
};
