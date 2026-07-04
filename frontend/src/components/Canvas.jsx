import { useEffect, useState, useRef } from "react";
import { Tldraw, DefaultToolbar } from "tldraw";
import "tldraw/tldraw.css";

// Canvas.jsx — professional collaborative whiteboard powered by tldraw with draggable toolbar

function Canvas({ socketRef, roomId, slideId, lines, setLines, onDrawEnd, theme }) {
  const [editor, setEditor] = useState(null);
  const saveTimeoutRef = useRef(null);
  const lastLoadedSlideIdRef = useRef(null);

  const isDark = theme === "dark";

  // Draggable toolbar state (defaults to left-centered)
  const [toolbarPos, setToolbarPos] = useState(() => {
    const saved = localStorage.getItem(`toolbar-pos-${roomId}`);
    return saved ? JSON.parse(saved) : { x: 16, y: window.innerHeight / 2 - 200 };
  });

  const dragStart = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

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

      // Restrict toolbar within browser viewport boundaries
      const boundedX = Math.max(10, Math.min(window.innerWidth - 90, newX));
      const boundedY = Math.max(10, Math.min(window.innerHeight - 480, newY));

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

    // Only load snapshot if the slideId actually changed to prevent overwriting active local edits
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

  // Handle Socket events & store change listeners
  useEffect(() => {
    if (!editor) return;
    const socket = socketRef.current;
    if (!socket) return;

    // Listen to changes made by the local user and broadcast them
    const cleanupListen = editor.store.listen(
      (event) => {
        if (event.source !== "user") return;

        // Broadcast delta changes via socket
        socket.emit("tldraw-change", {
          roomId,
          slideId,
          changes: event.changes,
        });

        // Debounce database saves to once per second of inactivity
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

    // Apply remote updates from collaborators
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

    // Listen for full canvas sync events (fallback)
    socket.on("sync-canvas", ({ slideId: incomingSlideId, canvasData }) => {
      if (incomingSlideId === slideId && canvasData?.store) {
        editor.store.loadSnapshot(canvasData);
      }
    });

    // Listen for clear-canvas event
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

  // Custom Toolbar component wrapping tldraw's default vertical toolbar inside a draggable container
  const components = {
    Toolbar: (props) => (
      <div
        className="fixed z-[100] flex flex-col items-center select-none"
        style={{
          left: `${toolbarPos.x}px`,
          top: `${toolbarPos.y}px`,
          pointerEvents: "all",
        }}
      >
        {/* Sleek, grab-able Drag Handle on top of the toolbar */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-14 h-5 rounded-t-xl flex items-center justify-center border-t border-x cursor-grab active:cursor-grabbing transition-colors duration-200 ${
            isDark
              ? "bg-[#141416] border-white/10 text-white/30 hover:text-white/60"
              : "bg-white border-neutral-200 text-neutral-400 hover:text-neutral-600"
          } ${isDragging ? "cursor-grabbing" : ""}`}
          title="Drag to reposition toolbar"
        >
          <svg width="18" height="6" viewBox="0 0 18 6" fill="currentColor" opacity="0.6">
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="9" cy="3" r="1.5" />
            <circle cx="15" cy="3" r="1.5" />
          </svg>
        </div>

        {/* Vertical Tldraw Toolbar */}
        <DefaultToolbar {...props} orientation="vertical" />
      </div>
    ),
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: isDark ? "#0c0c0e" : "#f5f5f7" }}>
      {/* CSS overrides to override inline positioning & style only the draggable wrapper and native toolbar */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Cancel tldraw default layout position for toolbar */
        .tlui-layout__main {
          display: none !important;
        }
        /* Styling overrides inside the vertical toolbar components */
        .tlui-toolbar {
          flex-direction: column !important;
          gap: 6px !important;
          padding: 8px !important;
          border-radius: 0 0 16px 16px !important;
          border: 1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"} !important;
          background: ${isDark ? "#141416" : "#ffffff"} !important;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3) !important;
          pointer-events: all !important;
        }
      `}} />

      <Tldraw
        onMount={(editorInstance) => {
          setEditor(editorInstance);
        }}
        components={components}
      />
    </div>
  );
}

export default Canvas;
