import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import ProfileModal from "../components/ProfileModal";
import { 
  LogOut, Send, Search, Paperclip, Smile, MoreVertical,
  MessageSquare, UserPlus, Bell, Check, X, CheckCheck, User, Image as ImageIcon, FileText
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";

const formatLastSeen = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / 60000);
  if (diffInMinutes < 1) return "last seen just now";
  if (diffInMinutes < 60) return `last seen ${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `last seen ${diffInHours}h ago`;
  return `last seen ${date.toLocaleDateString()}`;
};

export default function ChatPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("chats"); // 'chats', 'search', 'requests'
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(() => {
    const saved = localStorage.getItem("activeChatId");
    return saved ? { _id: saved, members: [], isGroupChat: false } : null; // Partial mock, will be updated by chats
  });
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Emoji & Attachments
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  
  // Friend Request States
  const [searchResults, setSearchResults] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [incomingRequests, setIncomingRequests] = useState([]);
  
  // Profile View
  const [viewingProfileId, setViewingProfileId] = useState(null);
  
  // Online Statuses Sync
  const [userStatuses, setUserStatuses] = useState({});
  
  const socket = useSocket();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial data
  useEffect(() => {
    fetchChats();
    fetchIncomingRequests();
  }, []);

  const fetchChats = () => {
    API.get("/chats/mine")
      .then((res) => {
        setChats(res.data);
        // Re-hydrate full selectedChat if we only have a partial mock from localStorage
        const savedChatId = localStorage.getItem("activeChatId");
        if (savedChatId) {
          const fullChat = res.data.find(c => c._id === savedChatId);
          if (fullChat) {
            setSelectedChat(fullChat);
          } else {
            localStorage.removeItem("activeChatId");
            setSelectedChat(null);
          }
        }
      })
      .catch((err) => console.error(err));
  };

  const fetchIncomingRequests = () => {
    API.get("/friend-requests/incoming")
      .then((res) => setIncomingRequests(res.data))
      .catch((err) => console.error(err));
  };

  // Fetch messages of selected chat
  useEffect(() => {
    if (selectedChat && selectedChat.members?.length > 0) {
      localStorage.setItem("activeChatId", selectedChat._id);
      
      API.get(`/messages/${selectedChat._id}`)
        .then((res) => {
          setMessages(res.data);
          if (socket) {
            socket.emit("messages:mark_read", { chatId: selectedChat._id });
          }
        })
        .catch((err) => console.error(err));
        
      if (socket) {
        socket.emit("chat:join", selectedChat._id);
      }
      
      return () => {
        if (socket) socket.emit("chat:leave", selectedChat._id);
      }
    } else if (!selectedChat) {
      localStorage.removeItem("activeChatId");
    }
  }, [selectedChat, socket]);

  // Listen for socket messages and chat updates
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg) => {
      fetchChats(); // Update chat order
      if (msg.chatId === selectedChat?._id) {
        setMessages((prev) => [...prev, msg]);
        if (msg.senderId !== user._id) {
          socket.emit("messages:mark_read", { chatId: selectedChat._id });
        }
      }
    };

    const handleChatListUpdate = () => {
      fetchChats();
    };

    const handleChatRemoved = (chatId) => {
      fetchChats();
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
      }
    };

    const handleMessagesRead = ({ chatId, readerId }) => {
      if (selectedChat?._id === chatId && readerId !== user._id) {
        setMessages((prev) => 
          prev.map(m => m.senderId === user._id || m.senderId?._id === user._id ? { ...m, status: "read" } : m)
        );
      }
    };
    
    const handleUserStatus = ({ userId, status, lastSeen }) => {
      setUserStatuses((prev) => ({
        ...prev,
        [userId]: { isOnline: status === "online", lastSeen }
      }));
    };
    
    socket.on("chat:message", handleNewMessage);
    socket.on("chat:created", handleChatListUpdate);
    socket.on("chat:removed", handleChatRemoved);
    socket.on("messages:read_updated", handleMessagesRead);
    socket.on("user:status", handleUserStatus);
    
    return () => {
      socket.off("chat:message", handleNewMessage);
      socket.off("chat:created", handleChatListUpdate);
      socket.off("chat:removed", handleChatRemoved);
      socket.off("messages:read_updated", handleMessagesRead);
      socket.off("user:status", handleUserStatus);
    };
  }, [socket, selectedChat, user._id]);

  // Handle Search Users
  useEffect(() => {
    if (activeTab === "search") {
      const delayFn = setTimeout(() => {
        API.get(`/friend-requests/search?query=${userSearchQuery}`)
          .then((res) => setSearchResults(res.data))
          .catch((err) => console.error(err));
      }, 500);
      return () => clearTimeout(delayFn);
    } else {
      setSearchResults([]);
    }
  }, [userSearchQuery, activeTab]);

  const sendMessage = async () => {
    if ((!newMsg.trim() && !attachment) || !selectedChat || isSending) return;
    
    setIsSending(true);
    try {
      let attachmentUrl = "";
      let attachmentType = "";
      
      if (attachment) {
        const formData = new FormData();
        formData.append("attachment", attachment);
        const uploadRes = await API.post("/messages/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        attachmentUrl = uploadRes.data.attachmentUrl;
        attachmentType = uploadRes.data.attachmentType;
      }

      await API.post("/messages", { 
        chatId: selectedChat._id, 
        text: newMsg,
        attachmentUrl,
        attachmentType
      });
      
      setNewMsg("");
      setAttachment(null);
      setAttachmentPreview(null);
      setShowEmojiPicker(false);
    } catch(err) {
      console.error(err);
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setAttachment(file);
      if (file.type.startsWith('image/')) {
        setAttachmentPreview(URL.createObjectURL(file));
      } else {
        setAttachmentPreview('file');
      }
    }
  };

  const DefaultAvatar = ({ className }) => (
    <div className={`flex items-center justify-center bg-indigo-50 text-indigo-300 ${className}`}>
      <User className="w-1/2 h-1/2" />
    </div>
  );

  const handleSendRequest = async (receiverId) => {
    try {
      const res = await API.post("/friend-requests/send", { receiverId });
      alert(res.data.msg);
      setSearchResults(prev => prev.map(u => u._id === receiverId ? { ...u, relationship: "request_sent" } : u));
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to send request");
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    try {
      const res = await API.post("/friend-requests/respond", { requestId, action });
      alert(res.data.msg);
      fetchIncomingRequests();
      if (action === "accepted") {
        fetchChats(); // refresh chats if accepted
      }
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to respond");
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm("Are you sure you want to unfriend this user? This will delete your chat history.")) return;
    try {
      const res = await API.post("/friend-requests/remove", { friendId });
      alert(res.data.msg);
      fetchChats();
      if (selectedChat?.members?.some(m => m._id === friendId)) {
        setSelectedChat(null);
      }
      setSearchResults(prev => prev.map(u => u._id === friendId ? { ...u, relationship: "none" } : u));
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to remove friend");
    }
  };

  const filteredChats = chats.filter(chat => {
    const memberName = chat.members.find(m => m._id !== user._id)?.username || "User";
    const nameToSearch = chat.isGroupChat ? chat.chatName : memberName;
    return nameToSearch.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-[320px] lg:w-[380px] bg-white border-r border-slate-200/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        
        {/* User Profile & Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0">
          <div 
            className="flex items-center gap-3 cursor-pointer group hover:bg-slate-50 p-1.5 -ml-1.5 rounded-xl transition-colors"
            onClick={() => setViewingProfileId(user._id)}
          >
            <div className="w-10 h-10 rounded-full bg-white text-slate-400 flex items-center justify-center shadow-md overflow-hidden relative border border-slate-100">
              {user.profileImage ? (
                <img src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${user.profileImage}`} alt="Me" className="w-full h-full object-cover" />
              ) : (
                <DefaultAvatar className="w-full h-full" />
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                <span className="text-[10px] text-white uppercase font-bold tracking-wider">Edit</span>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{user.firstName || user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</h2>
              <span className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
              </span>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 p-2 gap-2">
          <button 
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "chats" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
          >
            Chats
          </button>
          <button 
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "search" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
          >
            Find
          </button>
          <button 
            onClick={() => { setActiveTab("requests"); fetchIncomingRequests(); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors relative ${activeTab === "requests" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
          >
            Requests
            {incomingRequests.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>

        {/* Content based on tab */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
          {activeTab === "chats" && (
            <>
              <div className="px-2 mb-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="Search chats..." 
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                {filteredChats.length === 0 ? (
                  <div className="text-center text-slate-400 mt-10 text-sm">No chats found. Find friends to start!</div>
                ) : (
                  filteredChats.map((chat) => {
                    const otherUser = chat.members.find(m => m._id !== user._id);
                    const title = chat.isGroupChat ? chat.chatName : otherUser?.username || "User";
                    const isSelected = selectedChat?._id === chat._id;
                    const syncedStatus = otherUser ? userStatuses[otherUser._id] : null;
                    const isOnline = syncedStatus ? syncedStatus.isOnline : otherUser?.isOnline;

                    return (
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} key={chat._id} onClick={() => setSelectedChat(chat)} className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${isSelected ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "hover:bg-slate-50 text-slate-700"}`}>
                        <div 
                          className={`relative w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 border ${isSelected ? "border-indigo-400/50" : "border-slate-200"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (otherUser) setViewingProfileId(otherUser._id);
                          }}
                        >
                          {chat.isGroupChat ? (
                            <div className="w-full h-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">{title[0]?.toUpperCase()}</div>
                          ) : (
                            otherUser?.profileImage ? (
                              <img src={otherUser.profileImage.startsWith('http') ? otherUser.profileImage : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${otherUser.profileImage}`} alt="avatar" className="w-full h-full object-cover" />
                            ) : <DefaultAvatar className="w-full h-full" />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h3 className={`font-semibold text-sm truncate ${isSelected ? "text-white" : "text-slate-800"}`}>{title}</h3>
                          {!chat.isGroupChat && (
                            <span className={`text-[11px] flex items-center gap-1.5 mt-0.5 ${isSelected ? "text-indigo-100" : "text-slate-500"}`}>
                              {isOnline ? (
                                <><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online</>
                              ) : (
                                "Offline"
                              )}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeTab === "search" && (
            <>
              <div className="px-2 mb-3">
                <div className="relative">
                  <UserPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="Search by username..." 
                    value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-2 px-2">
                {searchResults.map((u) => {
                  return (
                    <div key={u._id} className="p-3 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setViewingProfileId(u._id)}>
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:ring-2 ring-indigo-400 ring-offset-2 transition-all">
                          {u.profileImage ? (
                            <img src={u.profileImage.startsWith('http') ? u.profileImage : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${u.profileImage}`} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <DefaultAvatar className="w-full h-full" />
                          )}
                        </div>
                        <span className="font-semibold text-sm text-slate-700 group-hover:text-indigo-600 transition-colors">{u.username}</span>
                      </div>
                      {u.relationship === "friends" ? (
                        <button 
                          onClick={() => handleRemoveFriend(u._id)}
                          className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
                        >
                          Unfriend
                        </button>
                      ) : u.relationship === "request_sent" ? (
                        <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-semibold">
                          Request Sent
                        </span>
                      ) : u.relationship === "request_received" ? (
                        <span className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-semibold">
                          Pending Reply
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleSendRequest(u._id)}
                          className="bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-200 transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
                {searchResults.length === 0 && (
                  <div className="text-center text-slate-400 text-sm mt-4">
                    {userSearchQuery 
                      ? "No users found matching your search." 
                      : "No other users are registered on the app yet."}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "requests" && (
            <div className="space-y-2 px-2">
              {incomingRequests.length === 0 ? (
                <div className="text-center text-slate-400 mt-10 text-sm flex flex-col items-center">
                  <Bell className="w-8 h-8 text-slate-200 mb-2" />
                  No pending requests.
                </div>
              ) : (
                incomingRequests.map((req) => (
                  <div key={req._id} className="p-3 border border-slate-100 rounded-xl flex flex-col gap-3 bg-slate-50">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setViewingProfileId(req.sender._id)}>
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:ring-2 ring-purple-400 ring-offset-2 transition-all">
                        {req.sender.profileImage ? (
                          <img src={req.sender.profileImage.startsWith('http') ? req.sender.profileImage : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${req.sender.profileImage}`} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <DefaultAvatar className="w-full h-full" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-slate-700 block group-hover:text-purple-600 transition-colors">{req.sender.username}</span>
                        <span className="text-xs text-slate-500">wants to connect</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRespondRequest(req._id, "accepted")}
                        className="flex-1 bg-indigo-600 text-white flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Accept
                      </button>
                      <button 
                        onClick={() => handleRespondRequest(req._id, "rejected")}
                        className="flex-1 bg-slate-200 text-slate-600 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-colors"
                      >
                        <X className="w-3 h-3" /> Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col mesh-bg relative">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-[72px] px-6 border-b border-slate-200/50 glass flex items-center justify-between sticky top-0 z-10">
              <div 
                className="flex items-center gap-4 cursor-pointer group hover:bg-slate-50/50 p-2 -ml-2 rounded-2xl transition-colors"
                onClick={() => {
                  if (!selectedChat.isGroupChat) {
                    const otherUser = selectedChat.members.find(m => m._id !== user._id);
                    if (otherUser) setViewingProfileId(otherUser._id);
                  }
                }}
              >
                <div className="relative w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                  {selectedChat.isGroupChat ? (
                    <div className="w-full h-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">{selectedChat.chatName?.[0]?.toUpperCase()}</div>
                  ) : (
                    selectedChat.members.find(m => m._id !== user._id)?.profileImage ? (
                      <img src={selectedChat.members.find(m => m._id !== user._id).profileImage.startsWith('http') ? selectedChat.members.find(m => m._id !== user._id).profileImage : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedChat.members.find(m => m._id !== user._id).profileImage}`} alt="avatar" className="w-full h-full object-cover" />
                    ) : <DefaultAvatar className="w-full h-full" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {selectedChat.isGroupChat ? selectedChat.chatName : selectedChat.members.find(m => m._id !== user._id)?.username || "User"}
                  </h3>
                  {!selectedChat.isGroupChat && (() => {
                    const otherUser = selectedChat.members.find(m => m._id !== user._id);
                    const syncedStatus = otherUser ? userStatuses[otherUser._id] : null;
                    const isOnline = syncedStatus ? syncedStatus.isOnline : otherUser?.isOnline;
                    const lastSeen = syncedStatus?.lastSeen || otherUser?.lastSeen;

                    return (
                      <span className="text-[12px] flex items-center gap-1.5 text-slate-500 font-medium">
                        {isOnline ? (
                          <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> Online</>
                        ) : (
                          lastSeen ? formatLastSeen(lastSeen) : "Offline"
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isMe = typeof msg.senderId === 'object' ? msg.senderId._id === user._id : msg.senderId === user._id;

                  return (
                    <motion.div key={msg._id || idx} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 mt-auto border border-slate-200 bg-white shadow-sm`}>
                        {isMe ? (
                          user.profileImage ? <img src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${user.profileImage}`} className="w-full h-full object-cover" /> : <DefaultAvatar className="w-full h-full" />
                        ) : (
                          selectedChat.members.find(m => m._id === msg.senderId)?.profileImage ? <img src={selectedChat.members.find(m => m._id === msg.senderId).profileImage.startsWith('http') ? selectedChat.members.find(m => m._id === msg.senderId).profileImage : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedChat.members.find(m => m._id === msg.senderId).profileImage}`} className="w-full h-full object-cover" /> : <DefaultAvatar className="w-full h-full" />
                        )}
                      </div>
                      <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`px-5 py-3 text-[15px] leading-relaxed flex flex-col gap-2 ${isMe ? "chat-bubble-send text-white rounded-[20px] rounded-br-sm" : "chat-bubble-receive text-slate-800 rounded-[20px] rounded-bl-sm"}`}>
                          
                          {/* Attachment Rendering */}
                          {msg.attachmentUrl && (
                            <div className="mb-1 rounded-xl overflow-hidden max-w-[240px]">
                              {msg.attachmentType === 'image' ? (
                                <img src={msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${msg.attachmentUrl}`} alt="Attachment" className="w-full h-auto cursor-pointer hover:opacity-90" onClick={() => window.open(msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${msg.attachmentUrl}`, '_blank')} />
                              ) : (
                                <div onClick={() => window.open(msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${msg.attachmentUrl}`, '_blank')} className="flex items-center gap-2 p-3 bg-black/10 rounded-xl cursor-pointer hover:bg-black/20 transition-colors">
                                  <FileText className="w-6 h-6" />
                                  <span className="text-sm font-medium truncate">File Attachment</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-end gap-2">
                            {msg.text && <span>{msg.text}</span>}
                            {isMe && (
                              <span className="mb-0.5 opacity-80" title={msg.status}>
                                {msg.status === "read" ? (
                                  <CheckCheck className="w-4 h-4 text-sky-300" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 relative">
              
              {/* Attachment Preview UI */}
              {attachmentPreview && (
                <div className="absolute bottom-full left-4 mb-2 p-2 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                  {attachmentPreview === 'file' ? (
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                      <FileText className="w-6 h-6" />
                    </div>
                  ) : (
                    <img src={attachmentPreview} alt="preview" className="w-12 h-12 object-cover rounded-lg" />
                  )}
                  <div className="flex flex-col max-w-[120px]">
                    <span className="text-xs font-semibold text-slate-700 truncate">{attachment.name}</span>
                    <span className="text-[10px] text-slate-500">{(attachment.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button onClick={() => {setAttachment(null); setAttachmentPreview(null)}} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-4 mb-2 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 z-50 animate-in slide-in-from-bottom-4">
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => setNewMsg((prev) => prev + emojiData.emoji)}
                    autoFocusSearch={false}
                  />
                </div>
              )}

              <div className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                <div className="flex gap-1 pb-1">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded-full transition-colors ${showEmojiPicker ? "bg-indigo-100 text-indigo-600" : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"}`}>
                    <Smile className="w-5 h-5" />
                  </button>
                  <label className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer">
                    <Paperclip className="w-5 h-5" />
                    <input type="file" className="hidden" onChange={handleAttachmentChange} />
                  </label>
                </div>
                <textarea
                  placeholder="Type a message..." value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none py-2.5 px-2 focus:outline-none text-slate-700 placeholder-slate-400" rows={1}
                />
                <button onClick={sendMessage} disabled={(!newMsg.trim() && !attachment) || isSending} className="p-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-0.5">
                  {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="text-center z-10 glass p-10 rounded-3xl shadow-xl border border-white/50 max-w-sm mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center mx-auto mb-6 rotate-3 hover:rotate-0 transition-transform">
                <MessageSquare className="w-10 h-10 text-white -rotate-3 hover:rotate-0 transition-transform" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 font-sans tracking-tight">Connect & Chat</h2>
              <p className="text-slate-500 text-[15px] leading-relaxed">
                Select a conversation or find new friends to start messaging instantly.
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {viewingProfileId && (
        <ProfileModal 
          userId={viewingProfileId} 
          isMe={viewingProfileId === user._id}
          onClose={() => setViewingProfileId(null)}
          onUpdate={(updatedUser) => {
            // Update local user state if it's the current user
            if (viewingProfileId === user._id) {
              // This is a quick patch. Normally you'd propagate this up to App.js 
              // where the master user state lives, but here we can just update localStorage 
              // or force a refresh to get the new avatar everywhere.
              Object.assign(user, updatedUser); // mutate local reference to immediately update UI
              // To properly trigger re-renders in other components that rely on user object,
              // we can re-fetch chats which populates members with new data.
              fetchChats();
            }
          }}
        />
      )}
    </div>
  );
}
