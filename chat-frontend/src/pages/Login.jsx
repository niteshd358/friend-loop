import { useState } from "react";
import API from "../api/axios";

export default function Login({ onSwitchToRegister, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", { email, password });
      const { token, user } = res.data;

      if (onLogin) onLogin(token, user);
    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-96"
      >
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-3 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          Login
        </button>

        <p className="mt-2 text-sm text-center">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-green-500 underline"
          >
            Register
          </button>
        </p>
      </form>
    </div>
  );
}
