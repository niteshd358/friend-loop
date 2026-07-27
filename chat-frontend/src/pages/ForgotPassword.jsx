import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Mail, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const res = await API.post("/auth/forgot-password", { email });
      setSuccess(res.data.msg || "Password reset email sent!");
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to send reset email.");
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
            <KeyRound className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-white/70">
            Enter your email and we'll send you a token to reset your password.
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
            {resetToken && (
              <div className="mt-3 p-3 bg-black/20 rounded-lg border border-white/10 break-all text-center">
                <p className="text-xs text-white/70 mb-1 uppercase font-bold tracking-wider">Your Reset Token ID</p>
                <code className="font-mono text-emerald-300 font-bold text-lg select-all">{resetToken}</code>
              </div>
            )}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-white/50" />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                required
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !!success}
            className="w-full bg-white text-purple-600 font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="animate-pulse">Sending...</span>
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>
        </form>
        
        {success && (
          <div className="mt-4 text-center">
            <Link to="/reset-password" state={{ email }} className="text-white font-semibold hover:underline">
              I have my token - Reset Password
            </Link>
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-white/70 hover:text-white hover:underline">
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
