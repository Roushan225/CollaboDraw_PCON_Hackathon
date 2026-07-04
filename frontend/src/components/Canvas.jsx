import { useEffect, useState, useRef, useMemo } from "react";
import { Tldraw, createTLStore, loadSnapshot, defaultShapeUtils, defaultBindingUtils } from "tldraw";
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

/**
 * Canvas — powered by tldraw with pre-populated store pattern (official tldraw persistence approach).
 * 
 * KEY ARCHITECTURAL DECISION:
 * We use createTLStore() + loadSnapshot() BEFORE mounting <Tldraw />, then pass the store as a prop.
 * This means tldraw initializes with the correct canvas data already loaded — no timing issues,
 * no useEffect races, no blank canvas overwrites. This is the tldraw-documented approach for
 * custom storage backends (see: tldraw.dev/docs/persistence).
 * 
 * When slideId changes, useMemo creates a fresh store pre-populated with that slide's data.
 */
function Canvas({ socketRef, roomId, slideId, lines, onDrawEnd, theme }) {
  const isDark = theme === "dark";
  const saveTimeoutRef = useRef(null);
  const editorRef = useRef(null); // Use ref instead of state — avoids re-render on mount

  // ─── CORE: Create a pre-populated store each time the slide changes ────────
  // This is the official tldraw pattern: build the store with data BEFORE mounting.
  // useMemo ensures we only recreate when slideId changes (not on every render).
  const store = useMemo(() => {
    const newStore = createTLStore({
      shapeUtils: defaultShapeUtils,
      bindingUtils: defaultBindingUtils,
    });

    // Load saved snapshot into the store BEFORE tldraw ever sees it
    if (lines && typeof lines === "object" && lines.store) {
      try {
        loadSnapshot(newStore, lines);
      } catch (err) {
        console.warn("Could not load snapshot for slide, starting fresh:", err?.message);
      }
    }

    return newStore;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId]); // Re-create store on slide switch — not on `lines` change (would loop)
  // ──────────────────────────────────────────────────────────────────────────

  // Draggable toolbar state (persisted per room)
  const [toolbarPos, setToolbarPos] = useState(() => {
    const saved = localStorage.getItem(`toolbar-pos-${roomId}`);
    return saved ? JSON.parse(saved) : { x: 24, y: window.innerHeight / 2 - 260 };
  });
  const dragStart = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Active states
  const [activeTool, setActiveTool] = useState("select");
  const [hoveredTool, setHoveredTool] = useState(null);

  // Save toolbar position
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
      const newX = Math.max(10, Math.min(window.innerWidth - 320, event.clientX - dragStart.current.startX));
      const newY = Math.max(10, Math.min(window.innerHeight - 560, event.clientY - dragStart.current.startY));
      setToolbarPos({ x: newX, y: newY });
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

  // ─── Socket: sync store changes to collaborators & autosave to backend ────
  useEffect(() => {
    const editor = editorRef.current;
    const socket = socketRef.current;
    if (!editor || !socket) return;

    const cleanupListen = store.listen(
      (event) => {
        if (event.source !== "user") return;

        // Broadcast tldraw store changes to other collaborators in real-time
        socket.emit("tldraw-change", {
          roomId,
          slideId,
          changes: event.changes,
        });

        // Debounced autosave to MongoDB via backend API
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          const snapshot = editor.store.getSnapshot();
          onDrawEnd(snapshot);
        }, 1200);
      },
      { scope: "document", source: "user" }
    );

    // Receive incremental changes from collaborators
    const handleRemoteChange = ({ slideId: incomingSlideId, changes }) => {
      if (incomingSlideId !== slideId) return;
      editor.store.mergeRemoteChanges(() => {
        if (changes.added) Object.values(changes.added).forEach((r) => editor.store.put([r]));
        if (changes.updated) Object.values(changes.updated).forEach(([, to]) => editor.store.put([to]));
        if (changes.removed) Object.keys(changes.removed).forEach((id) => editor.store.remove([id]));
      });
    };

    // Full canvas sync from another user
    const handleSyncCanvas = ({ slideId: incomingSlideId, canvasData }) => {
      if (incomingSlideId === slideId && canvasData?.store) {
        try { loadSnapshot(editor.store, canvasData); } catch (e) { /* ignore */ }
      }
    };

    socket.on("tldraw-change", handleRemoteChange);
    socket.on("sync-canvas", handleSyncCanvas);

    return () => {
      cleanupListen();
      socket.off("tldraw-change", handleRemoteChange);
      socket.off("sync-canvas", handleSyncCanvas);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [store, slideId, roomId, socketRef, onDrawEnd]);

  // ─── Sync active tool indicator ───────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const interval = setInterval(() => {
      const tool = editor.getCurrentTool()?.id;
      if (tool && tool !== activeTool) setActiveTool(tool);
    }, 150);
    return () => clearInterval(interval);
  }, [activeTool]);

  // ─── Apply theme ──────────────────────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.user.updateUserPreferences({ colorScheme: isDark ? "dark" : "light" });
  }, [isDark]);

  // ─── Tool selector ────────────────────────────────────────────────────────
  const selectTool = (toolName) => {
    const editor = editorRef.current;
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

  // ─── Tutorial SVG cards ───────────────────────────────────────────────────
  const toolTutorials = {
    select: {
      title: "Select Tool (V)",
      desc: "Drag over shapes to select them. Click to resize, rotate, and edit.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <rect x="25" y="10" width="40" height="25" rx="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
          <g className="animate-tut-click">
            <path d="M 55 25 L 61 31 L 58 32 L 62 39 L 60 40 L 56 33 L 53 35 Z" fill="currentColor" />
          </g>
        </svg>
      ),
    },
    hand: {
      title: "Hand Tool (H)",
      desc: "Pan across the canvas without selecting or modifying shapes.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <g className="animate-tut-pan" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M42 22 V14 a2 2 0 0 1 4 0 v8 M46 20 V12 a2 2 0 0 1 4 0 v8 M50 21 V10 a2 2 0 0 1 4 0 v11 M54 22 V15 a2 2 0 0 1 4 0 v12" />
            <path d="M38 24 V18 a1.5 1.5 0 0 1 3 0 v8 M38 26 C36 30 40 38 48 38 h6 C58 38 61 34 61 30 V27" />
          </g>
        </svg>
      ),
    },
    draw: {
      title: "Pencil / Draw (D)",
      desc: "Draw freeform lines and sketches with pressure-sensitive tracing.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <path d="M 20 30 Q 40 10, 60 30 T 80 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" className="animate-tut-stroke" />
        </svg>
      ),
    },
    eraser: {
      title: "Eraser Tool (E)",
      desc: "Swipe over paths and shapes to delete them instantly.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
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
      desc: "Connect shapes with dynamic path arrows. Snaps to shape outlines.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <circle cx="25" cy="22" r="4" fill="currentColor" />
          <line x1="29" y1="22" x2="65" y2="22" stroke="currentColor" strokeWidth="1.8" className="animate-tut-stroke" />
          <path d="M 60 17 L 67 22 L 60 27" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    line: {
      title: "Line Tool (L)",
      desc: "Draw straight segments. Hold Shift to lock to 45° angles.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <circle cx="20" cy="30" r="3" fill="currentColor" />
          <circle cx="80" cy="15" r="3" fill="currentColor" />
          <line x1="20" y1="30" x2="80" y2="15" stroke="currentColor" strokeWidth="2.2" className="animate-tut-stroke" />
        </svg>
      ),
    },
    text: {
      title: "Text Block (T)",
      desc: "Add editable rich text headers and annotations.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <text x="50%" y="28" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Title Text</text>
          <line x1="30" y1="35" x2="70" y2="35" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </svg>
      ),
    },
    note: {
      title: "Sticky Note (N)",
      desc: "Create colored sticky notes for planning and ideating.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <rect x="35" y="8" width="30" height="30" rx="3" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
          <line x1="41" y1="16" x2="59" y2="16" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          <line x1="41" y1="22" x2="55" y2="22" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </svg>
      ),
    },
    rectangle: {
      title: "Rectangle (R)",
      desc: "Insert rectangle shapes. Toggle fills in the style panel.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <rect x="30" y="10" width="40" height="25" rx="3" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
        </svg>
      ),
    },
    ellipse: {
      title: "Circle / Ellipse (O)",
      desc: "Insert circle/oval shapes. Customize fills in the style panel.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <circle cx="50" cy="22" r="14" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
        </svg>
      ),
    },
    triangle: {
      title: "Triangle Shape",
      desc: "Create geometric triangles. Drag handles to adjust angles.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <polygon points="50,9 25,35 75,35" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
        </svg>
      ),
    },
    frame: {
      title: "Frame Container (F)",
      desc: "Define frame zones to group content or export specific regions.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <rect x="25" y="10" width="50" height="25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
          <text x="29" y="18" fill="currentColor" fontSize="7" fontWeight="bold">Frame 1</text>
        </svg>
      ),
    },
    laser: {
      title: "Laser Pointer (X)",
      desc: "Draw glowing temporary trails that fade out in real-time.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <path d="M 20 22 C 35 12, 65 32, 80 22" stroke="#ff3b30" strokeWidth="2" fill="none" strokeLinecap="round" className="animate-tut-laser" />
        </svg>
      ),
    },
    undo: {
      title: "Undo (Ctrl+Z)",
      desc: "Revert your last canvas stroke or modification.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <path d="M 70 25 A 15 15 0 0 0 40 18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M 45 13 L 38 18 L 45 23" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    redo: {
      title: "Redo (Ctrl+Y)",
      desc: "Re-apply the last undone stroke or shape edit.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <path d="M 30 25 A 15 15 0 0 1 60 18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M 55 13 L 62 18 L 55 23" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: isDark ? "#0c0c0e" : "#f5f5f7" }}>
      <style dangerouslySetInnerHTML={{__html: `
        ${tutorialStyles}
        .tlui-toolbar { display: none !important; }
        .tlui-help-menu, .tlui-debug-panel, .tlui-keyboard-shortcuts-button,
        [data-testid="help-menu"], [data-testid="debug-menu"] { display: none !important; }
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

      {/* Draggable Toolbar */}
      <div
        className="fixed z-[100] flex flex-col items-start select-none"
        style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px`, pointerEvents: "all" }}
      >
        {/* Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-12 h-5 rounded-t-xl flex items-center justify-center border-t border-x cursor-grab active:cursor-grabbing transition-colors ${
            isDark ? "bg-[#141416] border-white/10 text-white/30 hover:text-white/60" : "bg-white border-neutral-200 text-neutral-400 hover:text-neutral-600"
          } ${isDragging ? "cursor-grabbing" : ""}`}
        >
          <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor">
            <circle cx="2" cy="2" r="1" /><circle cx="7" cy="2" r="1" /><circle cx="12" cy="2" r="1" />
          </svg>
        </div>

        {/* Tool Buttons */}
        <div className={`w-12 border p-2 flex flex-col gap-1.5 items-center rounded-b-xl ${
          isDark ? "bg-[#141416] border-white/10 text-white" : "bg-white border-neutral-200 text-neutral-800"
        }`}>
          {[
            { id: "select", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4l12 7.2-7 1.8 5 5-2 2-5-5-1.8 7z"/></svg> },
            { id: "hand", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M6 14v-1.5a1.5 1.5 0 0 0-3 0V18a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3"/></svg> },
            { id: "draw", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> },
            { id: "eraser", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m20 20-6.05-6.05"/><path d="M10 20v-5"/><path d="M17 17v-4"/><path d="M4 20h6"/><path d="M18.8 4.2a2.4 2.4 0 0 0-3.4 0l-12 12a2.4 2.4 0 0 0 0 3.4l1.6 1.6a2.4 2.4 0 0 0 3.4 0l12-12a2.4 2.4 0 0 0 0-3.4Z"/></svg> },
            { id: "arrow", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> },
            { id: "line", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="20" x2="20" y2="4"/></svg> },
            { id: "text", icon: <span className="font-extrabold text-sm select-none">T</span> },
            { id: "note", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg> },
            { id: "rectangle", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> },
            { id: "ellipse", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg> },
            { id: "triangle", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,3 2,21 22,21"/></svg> },
            { id: "frame", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg> },
            { id: "laser", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> },
          ].map(({ id, icon }) => (
            <button
              key={id}
              onClick={() => selectTool(id)}
              onMouseEnter={() => setHoveredTool(id)}
              onMouseLeave={() => setHoveredTool(null)}
              title={id}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                activeTool === id || activeTool === `${id}.idle`
                  ? "bg-[#007aff] text-white"
                  : isDark ? "hover:bg-white/5" : "hover:bg-neutral-100"
              }`}
            >
              {icon}
            </button>
          ))}

          <div className={`h-px w-6 my-1 ${isDark ? "bg-white/10" : "bg-neutral-200"}`} />

          <button
            onClick={() => editorRef.current?.undo()}
            onMouseEnter={() => setHoveredTool("undo")}
            onMouseLeave={() => setHoveredTool(null)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isDark ? "hover:bg-white/5 text-white/70 hover:text-white" : "hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button
            onClick={() => editorRef.current?.redo()}
            onMouseEnter={() => setHoveredTool("redo")}
            onMouseLeave={() => setHoveredTool(null)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isDark ? "hover:bg-white/5 text-white/70 hover:text-white" : "hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          </button>
        </div>

        {/* Tutorial card on hover */}
        {hoveredTool && toolTutorials[hoveredTool] && (
          <div className={`absolute left-14 top-12 w-60 p-4 border rounded-2xl shadow-2xl flex flex-col gap-2.5 backdrop-blur-xl ${
            isDark ? "bg-[#121214]/95 border-white/10 text-white" : "bg-white/95 border-neutral-200 text-neutral-800"
          }`}>
            <div>
              <h4 className="font-extrabold text-[11px] tracking-tight">{toolTutorials[hoveredTool].title}</h4>
              <p className={`text-[9px] mt-0.5 leading-relaxed ${isDark ? "text-white/50" : "text-neutral-500"}`}>
                {toolTutorials[hoveredTool].desc}
              </p>
            </div>
            <div className={`h-14 rounded-lg flex items-center justify-center overflow-hidden border ${
              isDark ? "bg-white/[0.02] border-white/5" : "bg-neutral-50 border-neutral-100"
            }`}>
              {toolTutorials[hoveredTool].svg}
            </div>
          </div>
        )}
      </div>

      {/*
        Pass the pre-populated store directly to Tldraw.
        Tldraw initializes with our saved data already loaded — no timing issues.
        This is the official tldraw persistence pattern for custom backends.
      */}
      <Tldraw
        store={store}
        onMount={(editorInstance) => {
          editorRef.current = editorInstance;

          // Apply theme
          editorInstance.user.updateUserPreferences({
            colorScheme: isDark ? "dark" : "light",
          });

          // Sync viewport bounds
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
            editorInstance.updateViewportScreenBounds();
          }, 100);
        }}
      />
    </div>
  );
}

export default Canvas;
