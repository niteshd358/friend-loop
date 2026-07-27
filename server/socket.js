import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";

const onlineUsers = new Map();
let ioInstance;

export function initSocket(httpServer, corsOrigin = "*") {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });
  ioInstance = io;

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
    
    // Join a personal room for user-specific events
    socket.join(userId);

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

    // The chat:send logic has been moved to the REST API (messageController.js) to avoid duplicate DB entries.

    // Mark messages as read
    socket.on("messages:mark_read", async ({ chatId }) => {
      if (!chatId) return;
      try {
        await Message.updateMany(
          { chatId, senderId: { $ne: userId }, status: { $ne: "read" } },
          { $set: { status: "read" } }
        );
        
        // Notify room that messages were read
        io.to(chatId).emit("messages:read_updated", { chatId, readerId: userId });
      } catch (err) {
        console.error("Socket error on mark_read:", err);
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
    });
  });

  return io;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }
  return ioInstance;
}
