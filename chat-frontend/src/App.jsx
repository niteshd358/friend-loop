import { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import API, { setAccessToken } from "./api/axios";
import { clearPrivateKeyFromDB } from "./utils/crypto";
import { SocketProvider } from "./context/SocketContext";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ChatPage = lazy(() => import("./pages/ChatPage"));

// Custom PrivateRoute component
const PrivateRoute = ({ children, user, loading }) => {
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Silent Refresh via HttpOnly cookie: restore in-memory access token without localStorage
    API.get("/auth/refresh")
      .then((refreshRes) => {
        setAccessToken(refreshRes.data.token);
        return API.get("/auth/me");
      })
      .then((res) => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        setAccessToken(null);
        setLoading(false);
      });
  }, []);

  const handleLogin = (token, userData) => {
    setAccessToken(token);
    setUser(userData);
    navigate("/");
  };

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (e) {
      // Continue cleanup
    }
    setAccessToken(null);
    await clearPrivateKeyFromDB();
    setUser(null);
    navigate("/login");
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  return (
    <SocketProvider user={user}>
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50 text-indigo-500 font-semibold text-xl">Loading Application...</div>}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute user={user} loading={loading}>
                <ChatPage user={user} onLogout={handleLogout} />
              </PrivateRoute>
            } 
          />
        </Routes>
      </Suspense>
    </SocketProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
