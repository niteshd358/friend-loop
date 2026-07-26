import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChatPage from "./pages/ChatPage";
import API from "./api/axios";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      API.get("/auth/me")
        .then((res) => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          // invalid token
          localStorage.removeItem("token");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50">Loading...</div>;

  if (!user) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login 
        onSwitchToRegister={() => setShowRegister(true)} 
        onLogin={(token, userData) => {
          localStorage.setItem("token", token);
          setUser(userData);
        }} 
      />
    );
  }

  return <ChatPage user={user} onLogout={handleLogout} />;
}

export default App;
