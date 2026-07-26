import Message from "../models/Message.js";
import Chat from "../models/Chat.js";

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .populate("senderId", "name email");

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;
    if (!chatId || !text) return res.status(400).json({ msg: "chatId and text are required" });

    const msg = await Message.create({
      chatId,
      senderId: req.user.id,
      text,
    });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: text });

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
