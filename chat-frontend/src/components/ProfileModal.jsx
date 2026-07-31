import { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Save, User, Calendar, Edit2, Loader2 } from "lucide-react";
import API from "../api/axios";

export default function ProfileModal({ userId, isMe, onClose, onUpdate }) {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get(`/profile/${userId}`);
        setProfile(res.data);
        setFormData({
          firstName: res.data.firstName || "",
          lastName: res.data.lastName || "",
          dob: res.data.dob ? new Date(res.data.dob).toISOString().split('T')[0] : "",
          gender: res.data.gender || "",
        });
        if (res.data.profileImage) {
          const imgUrl = res.data.profileImage.startsWith('http') 
            ? res.data.profileImage 
            : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${res.data.profileImage}`;
          setImagePreview(imgUrl);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = new FormData();
      if (formData.firstName) data.append("firstName", formData.firstName);
      if (formData.lastName) data.append("lastName", formData.lastName);
      if (formData.dob) data.append("dob", formData.dob);
      if (formData.gender) data.append("gender", formData.gender);
      if (imageFile) data.append("profileImage", imageFile);

      const res = await API.put("/profile/update", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setProfile(res.data.user);
      setIsEditing(false);
      if (onUpdate) onUpdate(res.data.user);
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!userId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative"
        >
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full backdrop-blur-md transition-all">
              <X className="w-5 h-5" />
            </button>
            {isMe && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="absolute top-4 left-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md transition-all flex items-center gap-1 text-sm font-medium">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {/* Avatar */}
          <div className="relative px-6 flex justify-center -mt-16 mb-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-500 text-4xl font-bold">
                    {profile?.username?.[0]?.toUpperCase() || <User className="w-12 h-12" />}
                  </div>
                )}
              </div>
              
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors border-2 border-white">
                  <Camera className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : isEditing ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">First Name</label>
                    <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="First Name" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Last Name</label>
                    <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Last Name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Date of Birth</label>
                    <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Gender</label>
                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center animate-in fade-in duration-300">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-1">
                  {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}` : profile.username}
                </h3>
                <p className="text-sm font-medium text-indigo-500 mb-4">@{profile.username}</p>
                
                <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <User className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</p>
                      <p className="text-sm font-medium">{profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}` : "Not provided"}</p>
                    </div>
                  </div>
                  <div className="w-full h-px bg-slate-200"></div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                      <p className="text-sm font-medium">
                        {profile.dob ? new Date(profile.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not provided"}
                      </p>
                    </div>
                  </div>
                  {profile.gender && (
                    <>
                      <div className="w-full h-px bg-slate-200"></div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <User className="w-5 h-5 text-pink-400" />
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gender</p>
                          <p className="text-sm font-medium capitalize">{profile.gender}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
