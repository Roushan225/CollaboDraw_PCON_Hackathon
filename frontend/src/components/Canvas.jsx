import { useEffect, useState, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

// Canvas.jsx — professional collaborative whiteboard powered by tldraw with vertical draggable toolbar containing expanded tools
function Canvas({ socketRef, roomId, slideId, lines, setLines, onDrawEnd, theme }) {
  const [editor, setEditor] = useState(null);
  const saveTimeoutRef = useRef(null);
  const lastLoadedSlideIdRef = useRef(null);

  const isDark = theme === "dark";

  // Draggable toolbar state (defaults to left-centered)
  const [toolbarPos, setToolbarPos] = useState(() => {
    const saved = localStorage.getItem(`toolbar-pos-${roomId}`);
    return saved ? JSON.parse(saved) : { x: 24, y: window.innerHeight / 2 - 260 };
  });

  const dragStart = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Active Tool state
  const [activeTool, setActiveTool] = useState("select");

  // Save custom toolbar position locally
  useEffect(() => {
    localStorage.setItem(`toolbar-pos-${roomId}`, JSON.stringify(toolbarPos));
  }, [toolbarPos, roomId]);

  // Drag handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    dragStart.current = {
      startX: e.clientX - toolbarPos.x,
      startY: e.clientY - toolbarPos.y,
    };
    setIsDragging(true);

    const handleMouseMove = (event) => {
      if (!dragStart.current) return;
      const newX = event.clientX - dragStart.current.startX;
      const newY = event.clientY - dragStart.current.startY;

      const boundedX = Math.max(10, Math.min(window.innerWidth - 320, newX));
      const boundedY = Math.max(10, Math.min(window.innerHeight - 560, newY));

      setToolbarPos({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      dragStart.current = null;
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Handle active slide changed: load slide's shapes snapshot
  useEffect(() => {
    if (!editor) return;

    if (lastLoadedSlideIdRef.current !== slideId) {
      lastLoadedSlideIdRef.current = slideId;
      
      if (lines && typeof lines === "object" && lines.store) {
        try {
          editor.store.loadSnapshot(lines);
        } catch (err) {
          console.error("Failed to load slide snapshot", err);
        }
      } else {
        const shapes = editor.getCurrentPageShapes();
        if (shapes.length > 0) {
          editor.deleteShapes(shapes.map((s) => s.id));
        }
      }
    }
  }, [slideId, editor, lines]);

  // Sync React active tool state with editor's current tool
  useEffect(() => {
    if (!editor) return;
    const interval = setInterval(() => {
      const tool = editor.getCurrentTool()?.id;
      if (tool && tool !== activeTool) {
        setActiveTool(tool);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [editor, activeTool]);

  // Handle Socket events & store change listeners
  useEffect(() => {
    if (!editor) return;
    const socket = socketRef.current;
    if (!socket) return;

    const cleanupListen = editor.store.listen(
      (event) => {
        if (event.source !== "user") return;

        socket.emit("tldraw-change", {
          roomId,
          slideId,
          changes: event.changes,
        });

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          const snapshot = editor.store.getSnapshot();
          onDrawEnd(snapshot);
        }, 1000);
      },
      { scope: "document", source: "user" }
    );

    socket.on("tldraw-change", ({ slideId: incomingSlideId, changes }) => {
      if (incomingSlideId === slideId) {
        editor.store.mergeRemoteChanges(() => {
          if (changes.added) {
            Object.values(changes.added).forEach((record) => {
              editor.store.put([record]);
            });
          }
          if (changes.updated) {
            Object.values(changes.updated).forEach(([from, to]) => {
              editor.store.put([to]);
            });
          }
          if (changes.removed) {
            Object.keys(changes.removed).forEach((id) => {
              editor.store.remove([id]);
            });
          }
        });
      }
    });

    socket.on("sync-canvas", ({ slideId: incomingSlideId, canvasData }) => {
      if (incomingSlideId === slideId && canvasData?.store) {
        editor.store.loadSnapshot(canvasData);
      }
    });

    socket.on("clear-canvas", ({ slideId: incomingSlideId }) => {
      if (incomingSlideId === slideId) {
        const shapes = editor.getCurrentPageShapes();
        if (shapes.length > 0) {
          editor.deleteShapes(shapes.map((s) => s.id));
        }
      }
    });

    return () => {
      cleanupListen();
      socket.off("tldraw-change");
      socket.off("sync-canvas");
      socket.off("clear-canvas");
    };
  }, [editor, roomId, slideId, socketRef, onDrawEnd]);

  // Adjust theme on editor mount or theme change
  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({
        colorScheme: isDark ? "dark" : "light",
      });
    }
  }, [editor, isDark]);

  // Set tool programmatically
  const selectTool = (toolName) => {
    if (!editor) return;
    if (toolName === "ellipse") {
      editor.setCurrentTool("geo", { geo: "ellipse", shapeType: "ellipse" });
      setActiveTool("ellipse");
    } else if (toolName === "rectangle") {
      editor.setCurrentTool("geo", { geo: "rectangle", shapeType: "rectangle" });
      setActiveTool("rectangle");
    } else if (toolName === "triangle") {
      editor.setCurrentTool("geo", { geo: "triangle", shapeType: "triangle" });
      setActiveTool("triangle");
    } else {
      editor.setCurrentTool(toolName);
      setActiveTool(toolName);
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: isDark ? "#0c0c0e" : "#f5f5f7" }}>
      {/* Hide only native toolbar and navigation zone. Keep style panel! */}
      <style dangerouslySetInnerHTML={{__html: `
        .tlui-toolbar {
          display: none !important;
        }
        /* Hide bottom select.idle label & debug info completely */
        .tlui-help-menu,
        .tlui-debug-panel,
        .tlui-keyboard-shortcuts-button,
        [data-testid="help-menu"],
        [data-testid="debug-menu"],
        .tlui-style-panel__wrapper-inner > div:last-child {
          display: none !important;
        }
        /* Reposition page hamburger menu container to the bottom-left next to 100% zoom */
        .tlui-menu-zone {
          display: flex !important;
          position: absolute !important;
          bottom: 12px !important;
          left: 78px !important;
          top: auto !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          z-index: 99 !important;
        }
      `}} />

      {/* CUSTOM DRAGGABLE WRAPPER CONTAINER */}
      <div
        className="fixed z-[100] flex flex-col items-start select-none"
        style={{
          left: `${toolbarPos.x}px`,
          top: `${toolbarPos.y}px`,
          pointerEvents: "all",
        }}
      >
        {/* Grab-able Drag Handle on top of vertical tools */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-12 h-5 rounded-t-xl flex items-center justify-center border-t border-x cursor-grab active:cursor-grabbing transition-colors duration-150 ${
            isDark
              ? "bg-[#141416] border-white/10 text-white/30 hover:text-white/60"
              : "bg-white border-neutral-200 text-neutral-400 hover:text-neutral-600"
          } ${isDragging ? "cursor-grabbing" : ""}`}
          title="Drag to reposition toolbar"
        >
          <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor">
            <circle cx="2" cy="2" r="1" />
            <circle cx="7" cy="2" r="1" />
            <circle cx="12" cy="2" r="1" />
          </svg>
        </div>

        {/* 1. Vertical Toolbox Container */}
        <div className={`w-12 border p-2 flex flex-col gap-1.5 items-center rounded-b-xl transition-colors duration-150 ${
          isDark ? "bg-[#141416] border-white/10 text-white" : "bg-white border-neutral-200 text-neutral-800"
        }`}>
          {/* Select Tool */}
          <button
            onClick={() => selectTool("select")}
            title="Select tool"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "select"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 4l12 7.2-7 1.8 5 5-2 2-5-5-1.8 7z"/>
            </svg>
          </button>

          {/* Hand Tool */}
          <button
            onClick={() => selectTool("hand")}
            title="Grab / Hand tool"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "hand"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M6 14v-1.5a1.5 1.5 0 0 0-3 0V18a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3" />
            </svg>
          </button>

          {/* Pencil / Draw Tool */}
          <button
            onClick={() => selectTool("draw")}
            title="Pencil draw"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "draw" || activeTool === "draw.idle"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>

          {/* Eraser Tool */}
          <button
            onClick={() => selectTool("eraser")}
            title="Eraser tool"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "eraser"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m20 20-6.05-6.05" />
              <path d="M10 20v-5" />
              <path d="M17 17v-4" />
              <path d="M4 20h6" />
              <path d="M18.8 4.2a2.4 2.4 0 0 0-3.4 0l-12 12a2.4 2.4 0 0 0 0 3.4l1.6 1.6a2.4 2.4 0 0 0 3.4 0l12-12a2.4 2.4 0 0 0 0-3.4Z" />
            </svg>
          </button>

          {/* Arrow Tool */}
          <button
            onClick={() => selectTool("arrow")}
            title="Arrow connector"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "arrow"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          {/* Straight Line Tool */}
          <button
            onClick={() => selectTool("line")}
            title="Line tool"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "line"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="20" x2="20" y2="4" />
            </svg>
          </button>

          {/* Text Tool */}
          <button
            onClick={() => selectTool("text")}
            title="Text block"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "text"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <span className="font-extrabold text-sm select-none">T</span>
          </button>

          {/* Sticky Note Tool */}
          <button
            onClick={() => selectTool("note")}
            title="Sticky Note"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "note"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8.5L15.5 3Z" />
              <path d="M15 3v6h6" />
            </svg>
          </button>

          {/* Rectangle Shape Tool */}
          <button
            onClick={() => selectTool("rectangle")}
            title="Rectangle Shape"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "rectangle"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>

          {/* Ellipse Shape Tool */}
          <button
            onClick={() => selectTool("ellipse")}
            title="Ellipse / Circle Shape"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "ellipse"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          {/* Triangle Shape Tool */}
          <button
            onClick={() => selectTool("triangle")}
            title="Triangle Shape"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "triangle"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12,3 2,21 22,21" />
            </svg>
          </button>

          {/* Frame Group Tool */}
          <button
            onClick={() => selectTool("frame")}
            title="Frame Segment"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "frame"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>

          {/* Laser Pointer Tool */}
          <button
            onClick={() => selectTool("laser")}
            title="Laser pointer (temporary sketch)"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "laser"
                ? "bg-[#007aff] text-white"
                : (isDark ? "hover:bg-white/5" : "hover:bg-neutral-100")
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </button>

          {/* Divider line before actions */}
          <div className={`h-px w-6 my-1 ${isDark ? "bg-white/10" : "bg-neutral-200"}`} />

          {/* Undo Action */}
          <button
            onClick={() => editor?.undo()}
            title="Undo (Ctrl + Z)"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isDark ? "hover:bg-white/5 text-white/70 hover:text-white" : "hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>

          {/* Redo Action */}
          <button
            onClick={() => editor?.redo()}
            title="Redo (Ctrl + Y)"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isDark ? "hover:bg-white/5 text-white/70 hover:text-white" : "hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>
        </div>
      </div>

      <Tldraw
        onMount={(editorInstance) => {
          setEditor(editorInstance);
          // Sync bounds on mount to align laser and cursor positions
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
            editorInstance.updateViewportScreenBounds();
          }, 200);
        }}
      />
    </div>
  );
}

export default Canvas;
