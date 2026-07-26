import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";

const onlineUsers = new Map();

export function initSocket(httpServer, corsOrigin = "*") {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id };
      next();
    } catch (e) {
      next(e);
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);

    // Join a specific chat room
    socket.on("chat:join", (chatId) => {
      if (chatId) {
        socket.join(chatId);
      }
    });

    // Leave a specific chat room
    socket.on("chat:leave", (chatId) => {
      if (chatId) {
        socket.leave(chatId);
      }
    });

    // Send a message
    socket.on("chat:send", async ({ chatId, text }) => {
      if (!chatId || !text) return;

      try {
        const msg = await Message.create({
          chatId,
          senderId: userId,
          text,
        });

        await Chat.findByIdAndUpdate(chatId, { lastMessage: text });

        // Populate sender details before emitting
        await msg.populate("senderId", "name email");

        // Broadcast to the chat room
        io.to(chatId).emit("chat:message", msg);
      } catch (err) {
        console.error("Socket error on chat:send:", err);
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
    });
  });

  return io;
}
