/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from "react";
import API, { setAccessToken, getAccessToken } from "../axios";
import { clearPrivateKeyFromDB } from "../../utils/crypto";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getAccessToken() || "");

  useEffect(() => {
    if (token) {
      API.get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => logout());
    }
  }, [token]);

  const login = (newToken, userData) => {
    setAccessToken(newToken);
    setTokenState(newToken);
    if (userData) setUser(userData);
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (e) {
      // Continue
    }
    setAccessToken(null);
    setTokenState("");
    setUser(null);
    await clearPrivateKeyFromDB();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
