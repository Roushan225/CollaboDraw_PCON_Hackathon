import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Custom hook to create and return a stable socket connection
const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to the backend socket server
    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

    socketRef.current = io(SOCKET_URL);

    // Cleanup on component unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return socketRef;
};

export default useSocket;
