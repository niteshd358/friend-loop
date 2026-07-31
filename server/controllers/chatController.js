import Chat from "../models/Chat.js";

export const ensureChat = async (req, res) => {
  try {
    const me = req.user.id;
    const { otherId } = req.body;
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
    res.status(500).json({ error: err.message });
  }
};

export const getMyChats = async (req, res) => {
  try {
    const me = req.user.id;
    const chats = await Chat.find({ members: me })
      .populate("members", "username email firstName lastName profileImage")
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
