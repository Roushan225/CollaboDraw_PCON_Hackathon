import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Canvas from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import useSocket from "../hooks/useSocket";

function DrawingRoom() {
  const { roomId } = useParams();
  const socketRef = useSocket();

  // Drawing tool state
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [tool, setTool] = useState("pen");

  // Join the socket room when connected
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("connect", () => {
      socket.emit("join-room", roomId);
    });

    // If already connected before this effect runs
    if (socket.connected) {
      socket.emit("join-room", roomId);
    }
  }, [roomId, socketRef]);

  // Clear canvas — notify everyone in the room
  const handleClear = () => {
    socketRef.current?.emit("clear-canvas", roomId);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-4 gap-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">🎨 CollaboDraw</h1>
        <span className="text-gray-400 text-sm bg-gray-800 px-4 py-1 rounded-full">
          Room: <span className="text-blue-400 font-mono">{roomId}</span>
        </span>
      </div>

      {/* Toolbar */}
      <Toolbar
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        tool={tool}
        setTool={setTool}
        onClear={handleClear}
      />

      {/* Canvas */}
      <Canvas
        socketRef={socketRef}
        roomId={roomId}
        color={color}
        strokeWidth={strokeWidth}
        tool={tool}
      />
    </div>
  );
}

export default DrawingRoom;
