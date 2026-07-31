/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const SocketProvider = ({ user, children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // If the user is logged in, connect socket and pass the JWT token
    const token = localStorage.getItem("token"); // Assuming token is stored in localStorage

    if (user && token) {
      const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      const newSocket = io(socketUrl, {
        auth: { token },
      });
      
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
