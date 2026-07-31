import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import { getIO } from "../socket.js";

// Search for users to add as friends
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    let users;
    
    if (!query) {
      users = await User.find({ _id: { $ne: req.user.id } }).lean().select("username email profileImage");
    } else {
      users = await User.find({
        $and: [
          { _id: { $ne: req.user.id } },
          {
            $or: [
              { username: { $regex: query, $options: "i" } },
              { email: { $regex: query, $options: "i" } },
            ],
          },
        ],
      }).lean().select("username email profileImage");
    }

    const chats = await Chat.find({ members: req.user.id });
    const chatMemberIds = chats.flatMap(chat => chat.members.map(id => id.toString()));

    const requests = await FriendRequest.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
      status: "pending"
    });

    const augmentedUsers = users.map(u => {
      let status = "none";
      if (chatMemberIds.includes(u._id.toString())) {
        status = "friends";
      } else {
        const existingReq = requests.find(r => 
          (r.sender.toString() === req.user.id && r.receiver.toString() === u._id.toString()) ||
          (r.receiver.toString() === req.user.id && r.sender.toString() === u._id.toString())
        );
        if (existingReq) {
          status = existingReq.sender.toString() === req.user.id ? "request_sent" : "request_received";
        }
      }
      return { ...u, relationship: status };
    });
    
    res.json(augmentedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const sendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    
    if (receiverId === req.user.id) {
      return res.status(400).json({ msg: "You cannot send a request to yourself" });
    }
    
    // Check if they are already in a chat
    const existingChat = await Chat.findOne({
      members: { $all: [req.user.id, receiverId] }
    });
    
    if (existingChat) {
      return res.status(400).json({ msg: "You are already connected with this user" });
    }

    // Check if a request already exists in either direction
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user.id, receiver: receiverId },
        { sender: receiverId, receiver: req.user.id }
      ]
    });
    
    if (existingRequest) {
      return res.status(400).json({ msg: "A friend request already exists between you two" });
    }
    
    const request = new FriendRequest({
      sender: req.user.id,
      receiver: receiverId
    });
    
    await request.save();
    res.json({ msg: "Friend request sent successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getIncomingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user.id, status: "pending" })
      .populate("sender", "username email");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const respondRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: "accepted" or "rejected"
    
    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ msg: "Invalid action" });
    }
    
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ msg: "Request not found" });
    
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
        members: [request.sender, request.receiver]
      });
      await newChat.save();
      
      // Emit event to both users so they can update their chats list
      const io = getIO();
      io.to(request.sender.toString()).emit("chat:created");
      io.to(request.receiver.toString()).emit("chat:created");
      
      return res.json({ msg: "Friend request accepted! Chat created." });
    }
    
    res.json({ msg: "Friend request rejected." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    
    // Find and delete the chat
    const chat = await Chat.findOneAndDelete({
      members: { $all: [req.user.id, friendId] }
    });
    
    // Also delete any friend requests
    await FriendRequest.deleteMany({
      $or: [
        { sender: req.user.id, receiver: friendId },
        { sender: friendId, receiver: req.user.id }
      ]
    });
    
    if (chat) {
      // Notify both users
      const io = getIO();
      io.to(req.user.id.toString()).emit("chat:removed", chat._id);
      io.to(friendId.toString()).emit("chat:removed", chat._id);
    }
    
    res.json({ msg: "Friend removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
