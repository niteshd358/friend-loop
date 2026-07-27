import { useState } from "react";
import { motion } from "framer-motion";
import { MailCheck, ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api/axios";

export default function VerifyEmail() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email address is missing. Please login again.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const res = await API.post("/auth/verify-email", { email, code });
      setSuccess(res.data.msg || "Email verified successfully!");
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.msg || "Verification failed. Please check the code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass w-full max-w-md p-8 rounded-3xl shadow-2xl relative overflow-hidden"
      >
        <div className="text-center mb-8 relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner"
          >
            <MailCheck className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">Verify Email</h2>
          <p className="text-white/70">
            We sent a 6-digit code to <br/><strong>{email || "your email"}</strong>
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded-xl mb-6 text-sm relative z-10"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-green-500/20 border border-green-500/50 text-white px-4 py-3 rounded-xl mb-6 text-sm relative z-10"
          >
            {success}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              required
              maxLength={6}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-center tracking-[0.5em] text-lg font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // only allow digits
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !!success || code.length !== 6}
            className="w-full bg-white text-purple-600 font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="animate-pulse">Verifying...</span>
            ) : (
              <>
                Verify
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <button onClick={() => navigate("/login")} className="text-white/70 hover:text-white hover:underline">
            Back to Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
