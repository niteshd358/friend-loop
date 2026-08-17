import Chat from "../models/Chat.js";

class ChatRepository {
  async getUserChats(userId: string) {
    return Chat.find({ members: { $in: [userId] } })
      .populate("members", "username email profileImage isOnline lastSeen")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });
  }

  async findChatByMembers(members: string[]) {
    return Chat.findOne({ members: { $all: members } });
  }

  async createChat(members: string[]) {
    const chat = new Chat({ members });
    return chat.save();
  }

  async getChatMembers(userId: string) {
    const chats = await Chat.find({ members: userId });
    let chatMembers: any[] = [];
    chats.forEach((chat) => {
      chatMembers = chatMembers.concat(chat.members);
    });
    return [...new Set(chatMembers.map((id) => id.toString()))].filter(
      (id) => id !== userId
    );
  }
}

export default new ChatRepository();
