import { useRef, useEffect, useState } from "react";
import { Stage, Layer, Line } from "react-konva";

// Canvas.jsx — handles drawing locally and syncing via socket + sizing dynamically

function Canvas({ socketRef, roomId, slideId, color, strokeWidth, tool, lines, setLines, onDrawEnd }) {
  const isDrawing = useRef(false);
  const stageRef = useRef(null);

  // Track viewport dimensions to resize Konva container (accounting for 256px sidebar on desktop)
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth > 768 ? window.innerWidth - 256 : window.innerWidth,
    height: window.innerHeight - 200,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth > 768 ? window.innerWidth - 256 : window.innerWidth,
        height: window.innerHeight - 200,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for draw events from other users (checking slideId match)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("draw", ({ slideId: incomingSlideId, lineData }) => {
      if (incomingSlideId === slideId) {
        setLines((prev) => [...prev, lineData]);
      }
    });

    socket.on("clear-canvas", ({ slideId: incomingSlideId }) => {
      if (incomingSlideId === slideId) {
        setLines([]);
      }
    });

    return () => {
      socket.off("draw");
      socket.off("clear-canvas");
    };
  }, [socketRef, slideId, setLines]);

  // Mouse down — start a new line
  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = {
      points: [pos.x, pos.y],
      color: tool === "eraser" ? "#0a0a0a" : color,
      strokeWidth: tool === "eraser" ? strokeWidth * 3.5 : strokeWidth,
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
      if (updated.length === 0) return prev;
      const last = { ...updated[updated.length - 1] };
      last.points = [...last.points, point.x, point.y];
      updated[updated.length - 1] = last;
      return updated;
    });
  };

  // Mouse up — finish the line and emit to others + save to MongoDB
  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    setLines((currentLines) => {
      const lastLine = currentLines[currentLines.length - 1];
      if (lastLine && socketRef.current) {
        // Scope socket event to active slideId
        socketRef.current.emit("draw", { roomId, slideId, lineData: lastLine });
        // Call autosave callback
        onDrawEnd(currentLines);
      }
      return currentLines;
    });
  };

  return (
    <Stage
      ref={stageRef}
      width={dimensions.width}
      height={dimensions.height}
      className="overflow-hidden bg-[#0a0a0a]"
      style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
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
            tension={0.4}
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
