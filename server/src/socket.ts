import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import jwt, { JwtPayload } from "jsonwebtoken";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";
import User from "./models/User.js";

interface AuthenticatedSocket extends Socket {
  user?: { id: string };
}

const onlineUsers = new Map<string, string>();
export const getOnlineUsers = () => onlineUsers;

let ioInstance: Server;

let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export function initSocket(httpServer: any, corsOrigin = "*") {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  if (process.env.NODE_ENV !== "test") {
    try {
      pubClient = new Redis(process.env.REDIS_URI || "redis://localhost:6379");
      subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log("Socket.io Redis adapter connected ✅");
    } catch (err) {
      console.error("Redis adapter error:", err);
    }
  }

  ioInstance = io;

  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      socket.user = { id: payload.id };
      next();
    } catch (e) {
      next(e);
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    const userId = socket.user?.id;
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    
    // Broadcast online status globally
    io.emit("user:status", { userId, status: "online" });

    // Join a personal room for user-specific events
    socket.join(userId);
    
    // Mark pending messages as delivered
    try {
      const chats = await Chat.find({ members: userId });
      const chatIds = chats.map(c => c._id);
      
      const updated = await Message.updateMany(
        { chatId: { $in: chatIds }, senderId: { $ne: userId }, status: "sent" },
        { $set: { status: "delivered" } }
      );
      
      if (updated.modifiedCount > 0) {
        chatIds.forEach(cid => {
          io.to(cid.toString()).emit("messages:delivered_updated", { chatId: cid.toString(), delivererId: userId });
        });
      }
    } catch (err) {
      console.error("Error marking messages as delivered:", err);
    }

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

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      const lastSeenTime = Date.now();
      
      // Emit offline status
      io.emit("user:status", { userId, status: "offline", lastSeen: lastSeenTime });
      
      try {
        await User.findByIdAndUpdate(userId, { lastSeen: lastSeenTime });
      } catch (err) {
        console.error("Error updating lastSeen on disconnect:", err);
      }
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
