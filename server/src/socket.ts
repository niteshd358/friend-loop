import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
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

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "supersecretkey";

export function initSocket(httpServer: any, corsOrigin: any = "*") {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  if (process.env.NODE_ENV !== "test" && process.env.REDIS_URI) {
    try {
      pubClient = new Redis(process.env.REDIS_URI, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) {
            console.warn("Redis connection failed. Falling back to in-memory adapter.");
            return null;
          }
          return Math.min(times * 50, 2000);
        },
      });
      subClient = pubClient.duplicate();

      pubClient.on("error", (err) => console.error("Redis Pub Error:", err.message));
      subClient.on("error", (err) => console.error("Redis Sub Error:", err.message));

      io.adapter(createAdapter(pubClient, subClient));
      console.log("Socket.io Redis adapter connected ✅");
    } catch (err) {
      console.error("Redis adapter setup error:", err);
    }
  }

  ioInstance = io;

  // Socket Authentication Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token required"));

      const payload = jwt.verify(token, getAccessSecret()) as any;
      if (payload.typ && payload.typ !== "access") {
        return next(new Error("Invalid token type"));
      }

      socket.user = { id: payload.id };
      next();
    } catch (e: any) {
      next(new Error("Unauthorized socket connection"));
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    const userId = socket.user?.id;
    if (!userId) return;

    onlineUsers.set(userId, socket.id);
    socket.join(userId); // Personal room for user-targeted notifications

    // Privacy (Friends-only Presence): Broadcast online status ONLY to authorized friends/chat members
    try {
      const chats = await Chat.find({ members: userId });
      const friendIds = [
        ...new Set(
          chats
            .flatMap((c) => c.members.map((m: any) => m.toString()))
            .filter((id) => id !== userId)
        ),
      ];

      // Automatically join all authorized chat rooms so user receives instant message updates
      chats.forEach((c) => {
        socket.join(c._id.toString());
      });

      friendIds.forEach((friendId) => {
        io.to(friendId).emit("user:status", { userId, status: "online" });
      });

      // Mark pending messages as delivered
      const chatIds = chats.map((c) => c._id);
      const updated = await Message.updateMany(
        { chatId: { $in: chatIds }, senderId: { $ne: userId }, status: "sent" },
        { $set: { status: "delivered" } }
      );

      if (updated.modifiedCount > 0) {
        chatIds.forEach((cid) => {
          io.to(cid.toString()).emit("messages:delivered_updated", {
            chatId: cid.toString(),
            delivererId: userId,
          });
        });
      }
    } catch (err) {
      console.error("Error setting up connection state:", err);
    }

    // Access Control (IDOR & Room Authorization): Verify membership before joining chat room
    socket.on("chat:join", async (chatId) => {
      try {
        if (!chatId || typeof chatId !== "string" || !mongoose.isValidObjectId(chatId)) {
          return socket.emit("error", { msg: "Invalid chat ID" });
        }

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.members.some((m: any) => m.toString() === userId)) {
          return socket.emit("error", { msg: "Forbidden: You are not authorized to join this room" });
        }

        socket.join(chatId);
      } catch (err) {
        console.error("Socket error on chat:join:", err);
      }
    });

    // Leave a specific chat room
    socket.on("chat:leave", (chatId) => {
      if (chatId && typeof chatId === "string" && mongoose.isValidObjectId(chatId)) {
        socket.leave(chatId);
      }
    });

    // NoSQL Injection & Access Control: Validate chatId and verify membership before marking read
    socket.on("messages:mark_read", async (data) => {
      try {
        const chatId = data?.chatId;
        if (!chatId || typeof chatId !== "string" || !mongoose.isValidObjectId(chatId)) {
          return;
        }

        // Verify that the user is actually a member of this chat
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.members.some((m: any) => m.toString() === userId)) {
          return;
        }

        await Message.updateMany(
          { chatId, senderId: { $ne: userId }, status: { $ne: "read" } },
          { $set: { status: "read" } }
        );

        // Notify only the authorized room that messages were read
        io.to(chatId).emit("messages:read_updated", { chatId, readerId: userId });
      } catch (err) {
        console.error("Socket error on mark_read:", err);
      }
    });

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      const lastSeenTime = Date.now();

      // Privacy (Friends-only Presence): Broadcast offline status ONLY to authorized friends
      try {
        const chats = await Chat.find({ members: userId });
        const friendIds = [
          ...new Set(
            chats
              .flatMap((c) => c.members.map((m: any) => m.toString()))
              .filter((id) => id !== userId)
          ),
        ];

        friendIds.forEach((friendId) => {
          io.to(friendId).emit("user:status", { userId, status: "offline", lastSeen: lastSeenTime });
        });

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
