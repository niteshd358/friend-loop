/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getAccessToken } from "../api/axios";

const SocketContext = createContext(null);

export const SocketProvider = ({ user, children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = getAccessToken();

    if (user && token) {
      const socketUrl = import.meta.env.MODE === "production" ? "/" : "http://localhost:5000";

      const newSocket = io(socketUrl, {
        auth: (cb) => {
          cb({ token: getAccessToken() });
        },
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      newSocket.on("connect", () => {
        console.log("Socket connected ✅", newSocket.id);
      });

      newSocket.on("connect_error", (err) => {
        console.warn("Socket connection error:", err.message);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
