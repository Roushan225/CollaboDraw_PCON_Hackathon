import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line } from "react-konva";

// Canvas.jsx — handles drawing locally and syncing via socket

function Canvas({ socketRef, roomId, color, strokeWidth, tool }) {
  const [lines, setLines] = useState([]);      // all drawn lines
  const isDrawing = useRef(false);             // tracks if mouse is held down
  const stageRef = useRef(null);

  // Listen for draw events from other users
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Another user drew a line — add it to our canvas
    socket.on("draw", (lineData) => {
      setLines((prev) => [...prev, lineData]);
    });

    // Another user cleared the canvas
    socket.on("clear-canvas", () => {
      setLines([]);
    });

    return () => {
      socket.off("draw");
      socket.off("clear-canvas");
    };
  }, [socketRef]);

  // Mouse down — start a new line
  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = {
      points: [pos.x, pos.y],
      color: tool === "eraser" ? "#0f172a" : color,
      strokeWidth: tool === "eraser" ? strokeWidth * 3 : strokeWidth,
      tool,
    };
    setLines((prev) => [...prev, newLine]);
  };

  // Mouse move — extend the current line
  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    setLines((prev) => {
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      last.points = [...last.points, point.x, point.y];
      updated[updated.length - 1] = last;
      return updated;
    });
  };

  // Mouse up — finish the line and emit to others
  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Emit the completed line to other users in the room
    const lastLine = lines[lines.length - 1];
    if (lastLine && socketRef.current) {
      socketRef.current.emit("draw", { roomId, lineData: lastLine });
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth - 40}
      height={window.innerHeight - 150}
      className="rounded-xl overflow-hidden"
      style={{ background: "#0f172a", cursor: tool === "eraser" ? "cell" : "crosshair" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {lines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation="source-over"
          />
        ))}
      </Layer>
    </Stage>
  );
}

export default Canvas;
