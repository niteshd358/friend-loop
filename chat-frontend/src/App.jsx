import { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import API from "./api/axios";

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
    const token = localStorage.getItem("token");
    if (token) {
      API.get("/auth/me")
        .then((res) => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem("token");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  return (
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
