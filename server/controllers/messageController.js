import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import { getIO } from "../socket.js";

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .populate("senderId", "username email firstName lastName profileImage");

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId, text, attachmentUrl, attachmentType } = req.body;
    if (!chatId || (!text && !attachmentUrl)) return res.status(400).json({ msg: "chatId and text/attachment are required" });

    const chat = await Chat.findById(chatId);
    let status = "sent";
    
    const { getOnlineUsers } = await import("../socket.js");
    const onlineUsers = getOnlineUsers();
    
    if (chat && chat.members) {
      const otherMembersOnline = chat.members.some(m => m.toString() !== req.user.id && onlineUsers.has(m.toString()));
      if (otherMembersOnline) {
        status = "delivered";
      }
    }

    let msg = await Message.create({
      chatId,
      senderId: req.user.id,
      text: text || "",
      attachmentUrl: attachmentUrl || "",
      attachmentType: attachmentType || "",
      status
    });

    const lastMsgContent = attachmentUrl ? (attachmentType === 'image' ? '📷 Image' : '📎 Attachment') : text;
    await Chat.findByIdAndUpdate(chatId, { lastMessage: lastMsgContent });

    // Populate sender details before emitting
    msg = await msg.populate("senderId", "username email firstName lastName profileImage");

    // Emit to socket room
    try {
      const io = getIO();
      io.to(chatId).emit("chat:message", msg);
      
      // Echo Bot Logic
      if (chat && chat.members) {
        const botMemberId = chat.members.find(m => m.toString() !== req.user.id);
        if (botMemberId) {
          const { default: User } = await import("../models/User.js");
          const botUser = await User.findById(botMemberId);
          if (botUser && botUser.email === "bot@demo.com") {
            // Step 1: Mark as read after 1.5s
            setTimeout(async () => {
              await Message.updateMany(
                { chatId, senderId: req.user.id, status: { $ne: "read" } },
                { $set: { status: "read" } }
              );
              io.to(chatId).emit("messages:read_updated", { chatId, readerId: botUser._id.toString() });
              
              // Step 2: Reply after another 1s
              setTimeout(async () => {
                let botMsg = await Message.create({
                  chatId,
                  senderId: botUser._id,
                  text: `Echo: ${text || "I received your attachment!"}`,
                  status: "sent"
                });
                await Chat.findByIdAndUpdate(chatId, { lastMessage: botMsg.text });
                botMsg = await botMsg.populate("senderId", "username email firstName lastName profileImage");
                io.to(chatId).emit("chat:message", botMsg);
              }, 1000);
            }, 1500);
          }
        }
      }
    } catch (socketErr) {
      console.error("Socket emit failed:", socketErr);
    }

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadMessageAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }
    const attachmentUrl = `/uploads/${req.file.filename}`;
    const attachmentType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
    
    res.json({ attachmentUrl, attachmentType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
