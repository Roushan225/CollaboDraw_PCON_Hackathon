import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Custom hook to create and return a stable socket connection
const useSocket = () => {
  const socketRef = useRef(null);

  if (!socketRef.current) {
    let SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

    // Dynamically rewrite localhost to the actual IP address if accessing from another device in dev network
    if (
      import.meta.env.DEV &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" &&
      SOCKET_URL.includes("localhost")
    ) {
      SOCKET_URL = SOCKET_URL.replace("localhost", window.location.hostname);
    }

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
