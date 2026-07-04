import { useEffect, useState, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

// CSS Animation Keyframes for the micro-tutorial SVGs
const tutorialStyles = `
  @keyframes drawTutorialLine {
    0% { stroke-dashoffset: 100; }
    50% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -100; }
  }
  @keyframes selectClick {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.15) translate(4px, 4px); opacity: 1; }
  }
  @keyframes handPan {
    0%, 100% { transform: translateX(0px); }
    50% { transform: translateX(8px); }
  }
  @keyframes eraserWipe {
    0% { transform: translateX(-15px) rotate(0deg); opacity: 1; }
    50% { transform: translateX(15px) rotate(15deg); opacity: 0.3; }
    100% { transform: translateX(-15px) rotate(0deg); opacity: 1; }
  }
  @keyframes laserGlow {
    0%, 100% { opacity: 0.1; stroke-width: 1.5px; }
    50% { opacity: 1; stroke-width: 3.5px; }
  }
  .animate-tut-stroke {
    stroke-dasharray: 100;
    animation: drawTutorialLine 3s linear infinite;
  }
  .animate-tut-click {
    animation: selectClick 2s ease-in-out infinite;
    transform-origin: center;
  }
  .animate-tut-pan {
    animation: handPan 2.2s ease-in-out infinite;
  }
  .animate-tut-eraser {
    animation: eraserWipe 2.5s ease-in-out infinite;
  }
  .animate-tut-laser {
    animation: laserGlow 1.5s ease-in-out infinite;
  }
`;

// Canvas.jsx — professional collaborative whiteboard powered by tldraw with vertical draggable toolbar & hover-triggered SVG tutorials
function Canvas({ socketRef, roomId, slideId, lines, setLines, onDrawEnd, theme }) {
  const [editor, setEditor] = useState(null);
  const saveTimeoutRef = useRef(null);
  const lastLoadedSlideIdRef = useRef(null);
  const lastSavedSnapshotRef = useRef(null); // Prevents loading loops from local changes

  const isDark = theme === "dark";

  // Draggable toolbar state (defaults to left-centered)
  const [toolbarPos, setToolbarPos] = useState(() => {
    const saved = localStorage.getItem(`toolbar-pos-${roomId}`);
    return saved ? JSON.parse(saved) : { x: 24, y: window.innerHeight / 2 - 260 };
  });

  const dragStart = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Active states
  const [activeTool, setActiveTool] = useState("select");
  const [hoveredTool, setHoveredTool] = useState(null);

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

  // Handle active slide changed or lines fetched asynchronously: load slide's shapes snapshot
  useEffect(() => {
    if (!editor) return;

    // Skip loading if the incoming lines prop matches the exact snapshot we just saved locally
    if (lines && lastSavedSnapshotRef.current === lines) {
      return;
    }

    const isNewSlide = lastLoadedSlideIdRef.current !== slideId;
    const isNewSnapshot = lines && lastSavedSnapshotRef.current !== lines;

    if (isNewSlide || isNewSnapshot) {
      lastLoadedSlideIdRef.current = slideId;
      lastSavedSnapshotRef.current = lines;
      
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
          lastSavedSnapshotRef.current = snapshot; // Cache our saved snapshot locally
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

  // Tool Tutorial Contents with Animated SVGs
  const toolTutorials = {
    select: {
      title: "Select Tool (V)",
      desc: "Drag over shapes to select them. Click to resize, rotate, and edit parameters.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-80">
          <rect x="25" y="10" width="40" height="25" rx="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
          <g className="animate-tut-click">
            <path d="M 55 25 L 61 31 L 58 32 L 62 39 L 60 40 L 56 33 L 53 35 Z" fill="currentColor" />
          </g>
        </svg>
      ),
    },
    hand: {
      title: "Hand Tool (H)",
      desc: "Pan across the infinite drawing canvas without selecting or modifying existing shapes.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-85">
          <g className="animate-tut-pan" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M42 22 V14 a2 2 0 0 1 4 0 v8 M46 20 V12 a2 2 0 0 1 4 0 v8 M50 21 V10 a2 2 0 0 1 4 0 v11 M54 22 V15 a2 2 0 0 1 4 0 v12" />
            <path d="M38 24 V18 a1.5 1.5 0 0 1 3 0 v8 M38 26 C36 30 40 38 48 38 h6 C58 38 61 34 61 30 V27" />
          </g>
        </svg>
      ),
    },
    draw: {
      title: "Pencil / Draw (D)",
      desc: "Draw freeform lines and sketching outlines. Integrates pressure sensitivity tracing.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-80">
          <path d="M 20 30 Q 40 10, 60 30 T 80 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" className="animate-tut-stroke" />
        </svg>
      ),
    },
    eraser: {
      title: "Eraser Tool (E)",
      desc: "Swipe over vector paths, lines, and geometries to delete them instantly.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-80">
          <path d="M 25 22 L 75 22" stroke="currentColor" strokeWidth="3" opacity="0.15" strokeLinecap="round" />
          <path d="M 25 22 L 45 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <g className="animate-tut-eraser" stroke="currentColor" strokeWidth="1.5" fill="none">
            <rect x="42" y="10" width="16" height="12" rx="2" fill="currentColor" opacity="0.1" />
          </g>
        </svg>
      ),
    },
    arrow: {
      title: "Arrow Tool (A)",
      desc: "Connect shapes together with dynamic path arrows. Snaps securely to outlines.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-85">
          <circle cx="25" cy="22" r="4" fill="currentColor" />
          <line x1="29" y1="22" x2="65" y2="22" stroke="currentColor" strokeWidth="1.8" className="animate-tut-stroke" />
          <path d="M 60 17 L 67 22 L 60 27" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    line: {
      title: "Line Tool (L)",
      desc: "Draw straight, clean segments between click-points. Lock angles with Shift.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-80">
          <circle cx="20" cy="30" r="3" fill="currentColor" />
          <circle cx="80" cy="15" r="3" fill="currentColor" />
          <line x1="20" y1="30" x2="80" y2="15" stroke="currentColor" strokeWidth="2.2" className="animate-tut-stroke" />
        </svg>
      ),
    },
    text: {
      title: "Text Block (T)",
      desc: "Add editable rich text headers and annotations. Supports custom sizes & alignments.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-80">
          <text x="50%" y="28" textAnchor="middle" fill="currentColor" className="font-extrabold text-sm font-sans">Title Text</text>
          <line x1="30" y1="35" x2="70" y2="35" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </svg>
      ),
    },
    note: {
      title: "Sticky Note (N)",
      desc: "Create colored, self-resizing sticky note segments for planning and ideating.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-85">
          <rect x="35" y="8" width="30" height="30" rx="3" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
          <line x1="41" y1="16" x2="59" y2="16" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          <line x1="41" y1="22" x2="55" y2="22" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </svg>
      ),
    },
    rectangle: {
      title: "Rectangle Shape (R)",
      desc: "Insert square outline elements. Toggle fills and board borders in style card.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-85">
          <rect x="30" y="10" width="40" height="25" rx="3" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
        </svg>
      ),
    },
    ellipse: {
      title: "Circle / Ellipse (O)",
      desc: "Insert round geometry shapes. Use style grid to customize background fill formats.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-85">
          <circle cx="50" cy="22" r="14" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
        </svg>
      ),
    },
    triangle: {
      title: "Triangle Shape",
      desc: "Create geometric triangle outlines. Drag handles to stretch angles.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-85">
          <polygon points="50,9 25,35 75,35" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
        </svg>
      ),
    },
    frame: {
      title: "Frame Container (F)",
      desc: "Define distinct frame zones to group contents or export specific canvas regions.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-80">
          <rect x="25" y="10" width="50" height="25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
          <text x="29" y="18" fill="currentColor" className="text-[7px] font-bold">Frame 1</text>
        </svg>
      ),
    },
    laser: {
      title: "Laser Pointer (X)",
      desc: "Draw glowing temporary trails that automatically fade out in real-time.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-85">
          <path d="M 20 22 C 35 12, 65 32, 80 22" stroke="#ff3b30" strokeWidth="2" fill="none" strokeLinecap="round" className="animate-tut-laser" />
        </svg>
      ),
    },
    undo: {
      title: "Undo (Ctrl+Z)",
      desc: "Revert your last canvas drawing stroke, modification, or deletion.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-80">
          <path d="M 70 25 A 15 15 0 0 0 40 18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M 45 13 L 38 18 L 45 23" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    redo: {
      title: "Redo (Ctrl+Y)",
      desc: "Re-apply the last undone canvas stroke or shape edit change.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45" className="opacity-80">
          <path d="M 30 25 A 15 15 0 0 1 60 18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M 55 13 L 62 18 L 55 23" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: isDark ? "#0c0c0e" : "#f5f5f7" }}>
      {/* Hide only native toolbar and navigation zone. Reposition page menu & inject tutorial keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        ${tutorialStyles}
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
            onMouseEnter={() => setHoveredTool("select")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("hand")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("draw")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("eraser")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("arrow")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("line")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("text")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("note")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("rectangle")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("ellipse")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("triangle")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("frame")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("laser")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("undo")}
            onMouseLeave={() => setHoveredTool(null)}
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
            onMouseEnter={() => setHoveredTool("redo")}
            onMouseLeave={() => setHoveredTool(null)}
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

        {/* 2. ON HOVER: FLOATING TUTORIAL SVG CARD PANEL (Renders directly next to the hovered tool) */}
        {hoveredTool && toolTutorials[hoveredTool] && (
          <div
            className={`absolute left-14 top-12 w-60 p-4 border rounded-2xl shadow-2xl flex flex-col gap-2.5 backdrop-blur-xl transition-all duration-200 animate-in fade-in slide-in-from-left-2 ${
              isDark ? "bg-[#121214]/95 border-white/10 text-white" : "bg-white/95 border-neutral-200 text-neutral-800"
            }`}
          >
            <div>
              <h4 className="font-extrabold text-[11px] tracking-tight">{toolTutorials[hoveredTool].title}</h4>
              <p className={`text-[9px] mt-0.5 leading-relaxed ${isDark ? "text-white/50" : "text-neutral-500"}`}>
                {toolTutorials[hoveredTool].desc}
              </p>
            </div>
            
            {/* Animated SVG demo screen */}
            <div className={`h-14 rounded-lg flex items-center justify-center overflow-hidden border ${
              isDark ? "bg-white/[0.02] border-white/5" : "bg-neutral-50 border-neutral-100"
            }`}>
              {toolTutorials[hoveredTool].svg}
            </div>
          </div>
        )}
      </div>

      <Tldraw
        onMount={(editorInstance) => {
          setEditor(editorInstance);
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
