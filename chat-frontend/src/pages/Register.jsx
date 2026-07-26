import { useState } from "react";
import API from "../api/axios";

export default function Register({ onSwitchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/signup", {
        username,
        email,
        password,
      });

      setSuccess(res.data.msg || "Registration successful! Please login.");
      setError("");
      setUsername("");
      setEmail("");
      setPassword("");
      
      // Switch back to login form
      if (onSwitchToLogin) onSwitchToLogin();
    } catch (err) {
      setError(err.response?.data?.msg || "Registration failed");
      setSuccess("");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-4">Register</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        {success && <p className="text-green-500 mb-2">{success}</p>}
        
        <input
          type="text"
          placeholder="Username"
          className="w-full mb-3 p-2 border rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-3 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Register
        </button>

        <p className="mt-2 text-sm text-center">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-500 underline"
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}
