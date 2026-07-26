import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

export default function ChatPage({ user, onLogout }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const socket = useSocket();

  // Fetch all chats of user
  useEffect(() => {
    API.get("/chats/mine")
      .then((res) => setChats(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Fetch messages of selected chat
  useEffect(() => {
    if (selectedChat) {
      API.get(`/messages/${selectedChat._id}`)
        .then((res) => setMessages(res.data))
        .catch((err) => console.error(err));
        
      if (socket) {
        socket.emit("chat:join", selectedChat._id);
      }
      
      return () => {
        if (socket) socket.emit("chat:leave", selectedChat._id);
      }
    }
  }, [selectedChat, socket]);

  // Listen for socket new messages
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg) => {
      if (msg.chatId === selectedChat?._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    
    socket.on("chat:message", handleNewMessage);
    return () => socket.off("chat:message", handleNewMessage);
  }, [socket, selectedChat]);

  // Send new message
  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedChat) return;
    
    try {
      const res = await API.post("/messages", {
        chatId: selectedChat._id,
        text: newMsg,
      });
      
      const data = res.data;
      
      // We don't need optimistic update since socket will broadcast it back to us? 
      // Actually we might, but socket.js broadcasts to io.to(chatId) which includes the sender.
      // We'll let socket handle it, OR we emit via socket and let socket do DB save.
      // But we have both HTTP fallback and socket. We will just use socket.emit here.
      
      // Send via socket
      if (socket) {
        socket.emit("chat:send", { chatId: selectedChat._id, text: newMsg });
      }
      
      setNewMsg("");
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-100 border-r p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Chats</h2>
        <ul className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            // Find the other member in a 1-to-1 chat
            const otherMemberId = chat.members.find((m) => m !== user._id);
            // In a real app we'd populate the members to show their name, for now we might just have ID
            // We should ensure members are populated in getMyChats
            const memberName = chat.members.find(m => m._id !== user._id)?.username || "User";
            
            return (
              <li
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                  selectedChat?._id === chat._id
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-white hover:bg-gray-200 shadow-sm"
                }`}
              >
                {chat.isGroupChat ? chat.chatName : memberName}
              </li>
            );
          })}
        </ul>
        <button
          onClick={onLogout}
          className="mt-4 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold px-4 py-2 rounded-lg shadow-md w-full"
        >
          Logout
        </button>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-white shadow-sm flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center font-bold mr-3">
                {selectedChat.isGroupChat
                  ? selectedChat.chatName?.[0]?.toUpperCase()
                  : (selectedChat.members.find(m => m._id !== user._id)?.username?.[0]?.toUpperCase() || "U")}
              </div>
              <span className="font-semibold text-gray-800 text-lg">
                {selectedChat.isGroupChat
                  ? selectedChat.chatName
                  : selectedChat.members.find(m => m._id !== user._id)?.username || "User"}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => {
                const isMe = typeof msg.senderId === 'object' ? msg.senderId._id === user._id : msg.senderId === user._id;
                return (
                  <div
                    key={msg._id || idx}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-sm shadow-sm ${
                        isMe
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 border-gray-300 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-400 border rounded-full px-4 py-3 outline-none transition-all"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-500 hover:bg-blue-600 transition-colors text-white font-semibold px-6 py-3 rounded-full shadow-md"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
