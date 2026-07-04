import { useEffect, useState, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

// Canvas.jsx — professional collaborative whiteboard powered by tldraw

function Canvas({ socketRef, roomId, slideId, lines, setLines, onDrawEnd, theme }) {
  const [editor, setEditor] = useState(null);
  const saveTimeoutRef = useRef(null);

  const isDark = theme === "dark";

  // Handle active slide changed: load slide's shapes snapshot
  useEffect(() => {
    if (!editor) return;

    // Check if drawingData (lines) is a valid tldraw store snapshot
    if (lines && typeof lines === "object" && lines.store) {
      try {
        editor.store.loadSnapshot(lines);
      } catch (err) {
        console.error("Failed to load slide snapshot", err);
      }
    } else {
      // Safe clear: delete only shapes, preserving schema metadata
      const shapes = editor.getCurrentPageShapes();
      if (shapes.length > 0) {
        editor.deleteShapes(shapes.map((s) => s.id));
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
        // Only track user edits
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

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: isDark ? "#0c0c0e" : "#f5f5f7" }}>
      <Tldraw
        onMount={(editorInstance) => {
          setEditor(editorInstance);
        }}
      />
    </div>
  );
}

export default Canvas;
