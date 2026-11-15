import { Request, Response } from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import { getIO } from "../socket.js";
import { isValidObjectId } from "../middleware/validate.js";

export const getMessages = async (req: any, res: Response) => {
  try {
    const { chatId } = req.params;
    const { cursor, limit = 50 } = req.query as any;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ msg: "Invalid chat ID" });
    }

    // Access Control (IDOR): Verify the chat exists and the current user is a member
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    const isMember = chat.members.some((m: any) => m.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ msg: "Forbidden: You are not authorized to view messages in this chat" });
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

    let query: any = { chatId };
    if (cursor) {
      if (!isValidObjectId(cursor)) {
        return res.status(400).json({ msg: "Invalid cursor ID" });
      }
      const cursorMessage = await Message.findById(cursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      // Privacy: Omit email from sender details
      .populate("senderId", "username firstName lastName profileImage");

    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === safeLimit,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const sendMessage = async (req: any, res: Response) => {
  try {
    const { chatId, text, attachmentUrl, attachmentType } = req.body as any;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ msg: "Invalid or missing chatId" });
    }

    if (!text && !attachmentUrl) {
      return res.status(400).json({ msg: "Message text or attachment is required" });
    }

    // Access Control (IDOR): Verify the chat exists and user is an authorized member
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    const isMember = chat.members.some((m: any) => m.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ msg: "Forbidden: You cannot send messages to a chat you are not part of" });
    }

    // Upload Validation: Verify attachmentUrl is from trusted source (Cloudinary or local uploads)
    if (attachmentUrl) {
      if (typeof attachmentUrl !== "string") {
        return res.status(400).json({ msg: "Invalid attachmentUrl" });
      }
      const isCloudinary = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\//.test(attachmentUrl);
      const isLocalUpload = attachmentUrl.startsWith("/uploads/");
      if (!isCloudinary && !isLocalUpload) {
        return res.status(400).json({ msg: "Untrusted or invalid attachment URL" });
      }
      if (attachmentType && !["image", "file"].includes(attachmentType)) {
        return res.status(400).json({ msg: "Invalid attachmentType. Must be 'image' or 'file'" });
      }
    }

    let status = "sent";
    const { getOnlineUsers } = await import("../socket.js");
    const onlineUsers = getOnlineUsers();

    if (chat && chat.members) {
      const otherMembersOnline = chat.members.some(
        (m: any) => m.toString() !== req.user.id && onlineUsers.has(m.toString())
      );
      if (otherMembersOnline) {
        status = "delivered";
      }
    }

    let msg = await Message.create({
      chatId,
      senderId: req.user.id,
      text: typeof text === "string" ? text : "",
      attachmentUrl: attachmentUrl || "",
      attachmentType: attachmentType || "",
      status,
    });

    // Privacy: Never store plaintext or raw E2EE blobs in lastMessage preview
    let lastMsgContent: string;
    if (attachmentUrl) {
      lastMsgContent = attachmentType === "image" ? "📷 Image" : "📎 Attachment";
    } else if (text && text.startsWith("E2EE:")) {
      lastMsgContent = "🔒 Encrypted Message";
    } else {
      lastMsgContent = text;
    }

    await Chat.findByIdAndUpdate(chatId, { lastMessage: lastMsgContent });

    // Populate sender details without exposing email
    msg = await msg.populate("senderId", "username firstName lastName profileImage");

    // Emit to socket room
    try {
      const io = getIO();
      io.to(chatId).emit("chat:message", msg);

      // Echo Bot Logic for demo interaction
      if (chat && chat.members) {
        const botMemberId = chat.members.find((m: any) => m.toString() !== req.user.id);
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
                  status: "sent",
                });
                await Chat.findByIdAndUpdate(chatId, { lastMessage: botMsg.text });
                botMsg = await botMsg.populate("senderId", "username firstName lastName profileImage");
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
