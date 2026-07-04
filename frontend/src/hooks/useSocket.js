import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Custom hook to create and return a stable socket connection
const useSocket = () => {
  const socketRef = useRef(null);

  if (!socketRef.current) {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
    });
  }

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef;
};

export default useSocket;
