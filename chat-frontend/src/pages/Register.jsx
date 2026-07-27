import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, UserPlus, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await API.post("/auth/signup", {
        username,
        email,
        password,
      });

      setSuccess(res.data.msg || "Registration successful! Redirecting to login...");
      
      // Auto navigate to login
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.msg || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass w-full max-w-md p-8 rounded-3xl shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 -mt-16 -ml-16 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 right-0 -mb-16 -mr-16 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>

        <div className="text-center mb-8 relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner"
          >
            <UserPlus className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-white/70">Join us and start chatting</p>
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
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-white/50" />
              </div>
              <input
                type="text"
                placeholder="Username"
                required
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
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
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-white/50" />
              </div>
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !!success}
            className="w-full bg-white text-pink-600 font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="animate-pulse">Creating Account...</span>
            ) : (
              <>
                Sign Up
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-8 text-sm text-center text-white/70 relative z-10">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-white font-semibold hover:underline decoration-2 underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
