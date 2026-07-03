import { useRef, useEffect, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Arrow, Text } from "react-konva";

// Canvas.jsx — theme-aware background, shapes drawing, selecting, dragging, and deletion

function Canvas({ socketRef, roomId, slideId, color, strokeWidth, tool, lines, setLines, onDrawEnd, theme }) {
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  
  // Selected shape index state
  const [selectedIndex, setSelectedIndex] = useState(null);

  // For text tool: text input state
  const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, val: "" });

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth > 768 ? window.innerWidth - 80 : window.innerWidth,
    height: window.innerHeight - 96,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth > 768 ? window.innerWidth - 80 : window.innerWidth,
        height: window.innerHeight - 96,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for draw events from other users
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
        setSelectedIndex(null);
      }
    });

    socket.on("sync-canvas", ({ slideId: incomingSlideId, canvasData }) => {
      if (incomingSlideId === slideId) {
        setLines(canvasData);
      }
    });

    return () => {
      socket.off("draw");
      socket.off("clear-canvas");
      socket.off("sync-canvas");
    };
  }, [socketRef, slideId, setLines]);

  // Handle Delete/Backspace to delete selected shape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setLines((prev) => {
          const updated = prev.filter((_, idx) => idx !== selectedIndex);
          socketRef.current?.emit("sync-canvas", { roomId, slideId, canvasData: updated });
          onDrawEnd(updated);
          return updated;
        });
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, roomId, slideId, setLines, onDrawEnd, socketRef]);

  // Click empty stage to deselect
  const handleStageClick = (e) => {
    if (tool !== "select") return;
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedIndex(null);
    }
  };

  const isDark = theme === "dark";
  const canvasBg = isDark ? "#0c0c0e" : "#ffffff";

  // Mouse down — start shape drawing
  const handleMouseDown = (e) => {
    if (tool === "select") {
      const clickedShape = e.target;
      const clickedStage = clickedShape === clickedShape.getStage();
      
      if (!clickedStage) {
        const shapeIndex = clickedShape.attrs.indexVal;
        if (shapeIndex !== undefined) {
          setSelectedIndex(shapeIndex);
          return;
        }
      }
      setSelectedIndex(null);
      return;
    }
    
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === "text") {
      setTextInput({ show: true, x: pos.x, y: pos.y, val: "" });
      return;
    }

    isDrawing.current = true;
    
    const newShape = {
      tool,
      color: tool === "eraser" ? canvasBg : color,
      strokeWidth: tool === "eraser" ? strokeWidth * 4 : strokeWidth,
      points: [pos.x, pos.y],
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      radius: 0,
    };
    
    setLines((prev) => [...prev, newShape]);
  };

  // Mouse move — resize shape dynamically
  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    setLines((prev) => {
      const updated = [...prev];
      if (updated.length === 0) return prev;
      const last = { ...updated[updated.length - 1] };

      if (last.tool === "pen" || last.tool === "eraser") {
        last.points = [...last.points, pos.x, pos.y];
      } else if (last.tool === "rectangle") {
        last.width = pos.x - last.x;
        last.height = pos.y - last.y;
      } else if (last.tool === "circle") {
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        last.radius = Math.sqrt(dx * dx + dy * dy);
      } else if (last.tool === "arrow" || last.tool === "line") {
        last.points = [last.x, last.y, pos.x, pos.y];
      }

      updated[updated.length - 1] = last;
      return updated;
    });
  };

  // Mouse up — commit shape
  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    setLines((currentLines) => {
      const lastLine = currentLines[currentLines.length - 1];
      if (lastLine && socketRef.current) {
        socketRef.current.emit("draw", { roomId, slideId, lineData: lastLine });
        onDrawEnd(currentLines);
      }
      return currentLines;
    });
  };

  // Drag shape finish
  const handleDragEnd = (index, e) => {
    const { x, y } = e.target.position();
    setLines((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      
      if (target.tool === "rectangle" || target.tool === "circle" || target.tool === "text") {
        target.x += x;
        target.y += y;
      } else if (target.tool === "pen" || target.tool === "eraser" || target.tool === "arrow" || target.tool === "line") {
        target.points = target.points.map((val, idx) => {
          return idx % 2 === 0 ? val + x : val + y;
        });
        if (target.x !== undefined) target.x += x;
        if (target.y !== undefined) target.y += y;
      }

      updated[index] = target;
      e.target.position({ x: 0, y: 0 });

      socketRef.current?.emit("sync-canvas", { roomId, slideId, canvasData: updated });
      onDrawEnd(updated);

      return updated;
    });
  };

  // Confirm text addition
  const handleTextSubmit = (e) => {
    if (e.key === "Enter" && textInput.val.trim() !== "") {
      const newTextShape = {
        tool: "text",
        x: textInput.x,
        y: textInput.y,
        text: textInput.val,
        color: color,
        fontSize: Math.max(14, strokeWidth * 3),
      };
      
      setLines((prev) => {
        const updated = [...prev, newTextShape];
        socketRef.current?.emit("draw", { roomId, slideId, lineData: newTextShape });
        onDrawEnd(updated);
        return updated;
      });

      setTextInput({ show: false, x: 0, y: 0, val: "" });
    }
  };

  const textInputBg = isDark ? "bg-[#18181b] text-white border-neutral-700" : "bg-white text-neutral-900 border-neutral-300";

  return (
    <div className="relative w-full h-full">
      {textInput.show && (
        <input
          type="text"
          value={textInput.val}
          onChange={(e) => setTextInput(prev => ({ ...prev, val: e.target.value }))}
          onKeyDown={handleTextSubmit}
          onBlur={() => setTextInput({ show: false, x: 0, y: 0, val: "" })}
          placeholder="Type text & press Enter"
          autoFocus
          className={`absolute z-20 border rounded px-2.5 py-1.5 text-xs outline-none shadow-xl ${textInputBg}`}
          style={{ left: textInput.x, top: textInput.y }}
        />
      )}

      {tool === "select" && selectedIndex !== null && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-neutral-900/90 text-white border border-white/10 rounded-full px-4 py-1.5 text-[10px] font-semibold tracking-wide">
          Press <kbd className="bg-white/15 px-1.5 py-0.5 rounded font-mono">Backspace</kbd> or <kbd className="bg-white/15 px-1.5 py-0.5 rounded font-mono">Delete</kbd> to remove selected shape
        </div>
      )}

      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`overflow-hidden transition-colors duration-300 ${isDark ? "bg-[#0c0c0e]" : "bg-white"}`}
        style={{ cursor: tool === "select" ? "default" : (tool === "text" ? "text" : "crosshair") }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
      >
        <Layer>
          {lines.map((shape, i) => {
            const isSelected = selectedIndex === i;
            const commonProps = {
              key: i,
              draggable: tool === "select",
              onDragEnd: (e) => handleDragEnd(i, e),
              indexVal: i,
              strokeScaleEnabled: false,
              shadowColor: isSelected ? "#3b82f6" : "transparent",
              shadowBlur: isSelected ? 8 : 0,
              shadowOpacity: isSelected ? 0.8 : 0,
            };

            if (shape.tool === "pen" || shape.tool === "eraser") {
              return (
                <Line
                  {...commonProps}
                  points={shape.points}
                  stroke={shape.tool === "eraser" ? canvasBg : shape.color} // Dynamic eraser color
                  strokeWidth={shape.strokeWidth}
                  tension={0.4}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            } else if (shape.tool === "rectangle") {
              return (
                <Rect
                  {...commonProps}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                  cornerRadius={4}
                />
              );
            } else if (shape.tool === "circle") {
              return (
                <Circle
                  {...commonProps}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                />
              );
            } else if (shape.tool === "arrow") {
              return (
                <Arrow
                  {...commonProps}
                  points={shape.points}
                  pointerLength={10}
                  pointerWidth={10}
                  fill={shape.color}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                />
              );
            } else if (shape.tool === "line") {
              return (
                <Line
                  {...commonProps}
                  points={shape.points}
                  stroke={shape.color}
                  strokeWidth={shape.strokeWidth}
                />
              );
            } else if (shape.tool === "text") {
              return (
                <Text
                  {...commonProps}
                  x={shape.x}
                  y={shape.y}
                  text={shape.text}
                  fill={shape.color}
                  fontSize={shape.fontSize || 16}
                  fontFamily="sans-serif"
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}

export default Canvas;
