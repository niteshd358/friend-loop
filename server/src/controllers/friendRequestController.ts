import { Response } from "express";
import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import { getIO } from "../socket.js";
import { isValidObjectId } from "../middleware/validate.js";

// Utility to escape regex special characters to prevent ReDoS / regex injection
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Search for users to add as friends
export const searchUsers = async (req: any, res: Response) => {
  try {
    const { query } = req.query;

    // Regex search abuse prevention: require non-empty query of at least 2 chars
    if (typeof query !== "string" || query.trim().length < 2) {
      return res.json([]);
    }

    const sanitizedQuery = escapeRegex(query.trim());

    // Privacy & Security: Search by username only; do not expose or search arbitrary emails
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } },
        { username: { $regex: sanitizedQuery, $options: "i" } },
      ],
    })
      .limit(20)
      .lean()
      // Privacy: omit email from public search results
      .select("username firstName lastName profileImage lastSeen");

    const { getOnlineUsers } = await import("../socket.js");
    const onlineUsers = getOnlineUsers();

    const chats = await Chat.find({ members: req.user.id });
    const chatMemberIds = chats.flatMap((chat) => chat.members.map((id) => id.toString()));

    const requests = await FriendRequest.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
      status: "pending",
    });

    const augmentedUsers = users.map((u: any) => {
      let status = "none";
      if (chatMemberIds.includes(u._id.toString())) {
        status = "friends";
      } else {
        const existingReq = requests.find(
          (r: any) =>
            (r.sender.toString() === req.user.id && r.receiver.toString() === u._id.toString()) ||
            (r.receiver.toString() === req.user.id && r.sender.toString() === u._id.toString())
        );
        if (existingReq) {
          status = existingReq.sender.toString() === req.user.id ? "request_sent" : "request_received";
        }
      }
      return {
        ...u,
        relationship: status,
        isOnline: onlineUsers.has(u._id.toString()),
      };
    });

    res.json(augmentedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const sendRequest = async (req: any, res: Response) => {
  try {
    const { receiverId } = req.body as any;

    if (!isValidObjectId(receiverId)) {
      return res.status(400).json({ msg: "Valid receiverId is required" });
    }

    if (receiverId === req.user.id) {
      return res.status(400).json({ msg: "You cannot send a request to yourself" });
    }

    // Check if target user exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ msg: "Target user not found" });
    }

    // Check if they are already in a chat
    const existingChat = await Chat.findOne({
      members: { $all: [req.user.id, receiverId] },
    });

    if (existingChat) {
      return res.status(400).json({ msg: "You are already connected with this user" });
    }

    // Check if a request already exists in either direction
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user.id, receiver: receiverId },
        { sender: receiverId, receiver: req.user.id },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({ msg: "A friend request already exists between you two" });
    }

    const request = new FriendRequest({
      sender: req.user.id,
      receiver: receiverId,
    });

    await request.save();

    try {
      const io = getIO();
      io.to(receiverId.toString()).emit("friend_request:received");
    } catch {}

    res.json({ msg: "Friend request sent successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getIncomingRequests = async (req: any, res: Response) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user.id, status: "pending" })
      // Privacy: Omit email from sender details
      .populate("sender", "username firstName lastName profileImage");
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const respondRequest = async (req: any, res: Response) => {
  try {
    const { requestId, action } = req.body as any;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({ msg: "Valid requestId is required" });
    }

    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ msg: "Invalid action. Must be 'accepted' or 'rejected'" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ msg: "Request not found" });

    // IDOR check: verify the current user is the actual receiver
    if (request.receiver.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ msg: "Request is already processed" });
    }

    request.status = action;
    await request.save();

    if (action === "accepted") {
      // Create a new chat between the two users
      const newChat = new Chat({
        members: [request.sender, request.receiver],
      });
      await newChat.save();

      // Emit event to both users so they can update their chats list
      try {
        const io = getIO();
        io.to(request.sender.toString()).emit("chat:created");
        io.to(request.receiver.toString()).emit("chat:created");
      } catch (e) {
        // Continue if socket is not initialized
      }

      return res.json({ msg: "Friend request accepted! Chat created." });
    }

    res.json({ msg: "Friend request rejected." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const removeFriend = async (req: any, res: Response) => {
  try {
    const { friendId } = req.body as any;

    if (!isValidObjectId(friendId)) {
      return res.status(400).json({ msg: "Valid friendId is required" });
    }

    // Find and delete the chat
    const chat = await Chat.findOneAndDelete({
      members: { $all: [req.user.id, friendId] },
    });

    // Privacy & Integrity: Delete all orphaned messages associated with this chat
    if (chat) {
      await Message.deleteMany({ chatId: chat._id });
    }

    // Also delete any friend requests
    await FriendRequest.deleteMany({
      $or: [
        { sender: req.user.id, receiver: friendId },
        { sender: friendId, receiver: req.user.id },
      ],
    });

    if (chat) {
      // Notify both users
      try {
        const io = getIO();
        io.to(req.user.id.toString()).emit("chat:removed", chat._id);
        io.to(friendId.toString()).emit("chat:removed", chat._id);
      } catch (e) {
        // Continue
      }
    }

    res.json({ msg: "Friend removed and chat messages cleaned up successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
