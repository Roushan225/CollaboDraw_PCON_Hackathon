import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Tldraw,
  createTLStore,
  loadSnapshot,
  defaultShapeUtils,
  defaultBindingUtils,
  DefaultColorStyle,
  DefaultSizeStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  GeoShapeGeoStyle,
  useActions,
  useEditor,
  useValue
} from "tldraw";
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

const AUTOSAVE_DELAY_MS = 300;
const PRESENCE_COLORS = [
  "#007aff",
  "#34c759",
  "#ff9500",
  "#ff2d55",
  "#5856d6",
  "#00c7be",
  "#af52de",
  "#ff3b30",
];

const getPresenceColor = (seed = "") => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
};

const EMBED_APPS = [
  { id: 'youtube', name: 'YouTube', color: 'bg-red-500', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  { id: 'figma', name: 'Figma', color: 'bg-purple-500', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 12.5a3.5 3.5 0 1 1 0-7h4V2h3.5a3.5 3.5 0 0 1 0 7H12v3.5h3.5a3.5 3.5 0 0 1 0 7H12v3.5A3.5 3.5 0 0 1 8.5 24 3.5 3.5 0 0 1 5 20.5 3.5 3.5 0 0 1 8.5 17H12v-4.5H8zm0-7a3.5 3.5 0 0 0 0 7h4V5.5H8zM15.5 2a3.5 3.5 0 0 0 0 7h.1V2h-.1zm0 10.5a3.5 3.5 0 0 0 0 7h.1v-7h-.1zM8 16a3.5 3.5 0 0 0-3.5 3.5A3.5 3.5 0 0 0 8 23V16z"/></svg> },
  { id: 'spotify', name: 'Spotify', color: 'bg-green-500', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.239.54-.959.72-1.56.3z"/></svg> },
  { id: 'github', name: 'GitHub', color: 'bg-neutral-800', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> },
  { id: 'google_maps', name: 'Maps', color: 'bg-blue-500', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
  { id: 'codesandbox', name: 'CodeSandbox', color: 'bg-[#151515]', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 6L11.5 0.5V12L1.5 17.5V6ZM2.5 7.7V15.7L10.5 11.3V3.3L2.5 7.7ZM12.5 0.5L22.5 6V17.5L12.5 12V0.5ZM13.5 3.3V11.3L21.5 15.7V7.7L13.5 3.3ZM12 13.5L21 18.5L12 23.5L3 18.5L12 13.5ZM12 14.7L4.8 18.5L12 22.3L19.2 18.5L12 14.7Z"/></svg> },
  { id: 'other', name: 'Website', color: 'bg-neutral-500', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
];

// Custom bottom bar: zoom controls + Insert Embed + Upload Media + Export + Theme toggle
const CustomBottomBar = ({ isDark }) => {
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [url, setUrl] = useState("");
  const editor = useEditor();
  const actions = useActions();
  const isTldrawDark = useValue("tldraw color scheme", () => editor.user.getIsDarkMode(), [editor]);
  const zoomLevel = useValue("canvas zoom level", () => editor.getZoomLevel(), [editor]);
  const fileInputRef = useRef(null);

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    editor.putExternalContent({
      type: 'files',
      files,
      point: editor.getViewportPageBounds().center,
      ignoreParents: false,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEmbed = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    editor.putExternalContent({
      type: "url",
      url: url.trim(),
      point: editor.getViewportPageBounds().center,
    });
    closeDialog();
  };

  const closeDialog = () => {
    setIsEmbedOpen(false);
    setTimeout(() => { setSelectedApp(null); setUrl(""); }, 200);
  };

  return (
    <>
      <div className={`canvas-quick-actions pointer-events-auto fixed bottom-4 left-4 z-[100] flex items-center gap-1 rounded-[14px] border p-1.5 shadow-2xl backdrop-blur-xl transition-colors ${
        isDark ? "border-white/10 bg-[#111113]/88 text-white shadow-black/40" : "border-neutral-200 bg-white/[0.92] text-neutral-900 shadow-neutral-300/40"
      }`}>
        {/* Zoom */}
        <div className={`canvas-zoom-segment ${isDark ? "text-white" : "text-neutral-900"}`}>
          <button onClick={() => actions["zoom-out"]?.onSelect("custom-zoom")} className={`canvas-zoom-button ${isDark ? "hover:bg-white/10" : "hover:bg-neutral-100"}`} title="Zoom out">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
          <button onClick={() => actions["zoom-to-100"]?.onSelect("custom-zoom")} className={`canvas-zoom-value ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-neutral-100 hover:bg-neutral-200"}`} title="Reset zoom">
            {Math.round(zoomLevel * 100)}%
          </button>
          <button onClick={() => actions["zoom-in"]?.onSelect("custom-zoom")} className={`canvas-zoom-button ${isDark ? "hover:bg-white/10" : "hover:bg-neutral-100"}`} title="Zoom in">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>

        <div className={`h-5 w-px ${isDark ? "bg-white/10" : "bg-neutral-200"}`} />

        {/* Insert Embed */}
        <button onClick={() => setIsEmbedOpen(true)} className={`canvas-quick-action-button ${
          isDark ? "bg-white text-black hover:bg-neutral-100" : "bg-neutral-950 text-white hover:bg-neutral-800"
        }`} title="Insert Embed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>Insert Embed</span>
        </button>

        {/* Upload Media */}
        <button onClick={() => fileInputRef.current?.click()} className={`canvas-quick-action-button ${
          isDark ? "bg-white text-black hover:bg-neutral-100" : "bg-neutral-950 text-white hover:bg-neutral-800"
        }`} title="Upload Media">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Upload Media</span>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleMediaUpload} multiple accept="image/*,video/*,audio/*" className="hidden" />

        <div className={`h-5 w-px mx-1 ${isDark ? "bg-white/10" : "bg-neutral-200"}`} />

        {/* Export */}
        <button onClick={() => actions['export-as-png']?.onSelect('custom-menu')} className={`canvas-quick-action-button border ${
          isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200"
        }`} title="Export as PNG">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Export PNG</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => editor.user.updateUserPreferences({ colorScheme: isTldrawDark ? "light" : "dark" })}
          className={`canvas-theme-toggle-button border ${
            isTldrawDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200"
          }`}
          title={isTldrawDark ? "Switch to light" : "Switch to dark"}
        >
          <span className={`canvas-theme-toggle-track ${isTldrawDark ? "bg-white/10" : "bg-neutral-200"}`}>
            <span className={`canvas-theme-toggle-thumb ${isTldrawDark ? "translate-x-[18px] bg-white text-black" : "translate-x-0 bg-neutral-950 text-white"}`}>
              {isTldrawDark ? (
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 10.5A5 5 0 0 1 5.5 4 5.5 5.5 0 1 0 12 10.5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="3" /><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" strokeLinecap="round" /></svg>
              )}
            </span>
          </span>
          <span>{isTldrawDark ? "Dark" : "Light"}</span>
        </button>
      </div>

      {/* Embed Dialog */}
      {isEmbedOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} className={`w-[90%] max-w-[420px] p-6 rounded-[24px] shadow-2xl border flex flex-col gap-5 ${
            isDark ? "bg-[#141416]/95 border-white/10 text-white" : "bg-white/95 border-neutral-200 text-neutral-800"
          }`}>
            <div className="flex items-center gap-3">
              {selectedApp && (
                <button onClick={() => { setSelectedApp(null); setUrl(""); }} className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-neutral-100"}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
              )}
              <div>
                <h3 className="font-extrabold text-lg tracking-tight">{selectedApp ? `Embed ${selectedApp.name}` : "Insert Embed"}</h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-white/60" : "text-neutral-500"}`}>
                  {selectedApp ? `Paste a ${selectedApp.name} link below.` : "Pick an app or website to embed on your canvas."}
                </p>
              </div>
            </div>
            {!selectedApp ? (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {EMBED_APPS.map((app) => (
                  <button key={app.id} onClick={() => setSelectedApp(app)} className={`flex flex-col items-center justify-center gap-2 p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                    isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-neutral-50 border-neutral-200 hover:bg-white hover:shadow-md"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${app.color}`}>{app.icon}</div>
                    <span className="text-[9px] font-bold text-center tracking-wide">{app.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={handleEmbed} className="flex flex-col gap-3 mt-2">
                <input autoFocus type="url" required placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#007aff] font-medium ${
                    isDark ? "bg-white/5 border-white/10 text-white placeholder-white/30" : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400"
                  }`} />
                <div className="flex gap-2 justify-end mt-2">
                  <button type="button" onClick={closeDialog} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isDark ? "hover:bg-white/10 text-white/70" : "hover:bg-neutral-100 text-neutral-600"
                  }`}>Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg bg-[#007aff] hover:bg-[#0066cc] active:scale-95 flex items-center gap-2">
                    Embed {selectedApp.name}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

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
function Canvas({ socketRef, roomId, slideId, lines, onDrawEnd, theme, isChatOpen, isInviteOpen, currentUser, isReadonly }) {
  const isDark = theme === "dark";
  const saveTimeoutRef = useRef(null);
  const editorRef = useRef(null); // Use ref instead of state — avoids re-render on mount
  const fallbackUserIdRef = useRef(`guest-${Math.random().toString(36).slice(2, 10)}`);
  const [isEditorReady, setIsEditorReady] = useState(false); // Triggers effects that depend on editorRef

  // Custom style panel tracking for shape formatting
  const [activeStyles, setActiveStyles] = useState({
    color: 'black',
    size: 'm',
    dash: 'draw',
    fill: 'none',
  });

  // Query editor state to update React states with selection or active formatting styles
  const handleStyleChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // 1. Get from current selection first
    const sharedStyles = editor.getSharedStyles();
    let color = sharedStyles.get(DefaultColorStyle);
    let size = sharedStyles.get(DefaultSizeStyle);
    let dash = sharedStyles.get(DefaultDashStyle);
    let fill = sharedStyles.get(DefaultFillStyle);

    // If it returns an object with a 'value' property, extract it
    if (color && typeof color === 'object' && 'value' in color) color = color.value;
    if (size && typeof size === 'object' && 'value' in size) size = size.value;
    if (dash && typeof dash === 'object' && 'value' in dash) dash = dash.value;
    if (fill && typeof fill === 'object' && 'value' in fill) fill = fill.value;

    // 2. Fallback to active styles for next shapes if selection is empty
    if (color === undefined) color = editor.getStyleForNextShape(DefaultColorStyle);
    if (size === undefined) size = editor.getStyleForNextShape(DefaultSizeStyle);
    if (dash === undefined) dash = editor.getStyleForNextShape(DefaultDashStyle);
    if (fill === undefined) fill = editor.getStyleForNextShape(DefaultFillStyle);

    const newColor = color || 'black';
    const newSize = size || 'm';
    const newDash = dash || 'draw';
    const newFill = fill || 'none';

    setActiveStyles((prev) => {
      if (prev.color === newColor && prev.size === newSize && prev.dash === newDash && prev.fill === newFill) return prev;
      return { color: newColor, size: newSize, dash: newDash, fill: newFill };
    });
  }, []);

  // Helper to set style for both current selected shapes and next shapes to be drawn
  const setStyle = (style, value) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setStyleForSelectedShapes(style, value);
    editor.setStyleForNextShapes(style, value);
    
    // Immediately query editor to update UI state
    handleStyleChange();
  };

  useEffect(() => {
    handleStyleChange();
  }, [handleStyleChange]);

  // Active states
  const [activeTool, setActiveTool] = useState("select");
  const [hoveredTool, setHoveredTool] = useState(null);
  const [showShapesMenu, setShowShapesMenu] = useState(false);

  const tools = [
    { id: "select", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4l12 7.2-7 1.8 5 5-2 2-5-5-1.8 7z"/></svg> },
    { id: "hand", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M6 14v-1.5a1.5 1.5 0 0 0-3 0V18a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3"/></svg> },
    { id: "draw", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> },
    { id: "highlight", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h3l6-6M9 11l3 3M9 11l4-4M12 14l4-4M13 7l3 3M16 10l5-5-2-2-5 5"/></svg> },
    { id: "eraser", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m20 20-6.05-6.05"/><path d="M10 20v-5"/><path d="M17 17v-4"/><path d="M4 20h6"/><path d="M18.8 4.2a2.4 2.4 0 0 0-3.4 0l-12 12a2.4 2.4 0 0 0 0 3.4l1.6 1.6a2.4 2.4 0 0 0 3.4 0l12-12a2.4 2.4 0 0 0 0-3.4Z"/></svg> },
    { id: "arrow", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> },
    { id: "line", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="20" x2="20" y2="4"/></svg> },
    { id: "text", icon: <span className="font-extrabold text-sm select-none">T</span> },
    { id: "note", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg> },
    { id: "rectangle", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> },
    { id: "ellipse", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg> },
    { id: "more-shapes", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 8-8 8-8-8z"/><path d="M12 12v3M10.5 13.5h3"/></svg> },
    { id: "frame", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg> },
    { id: "laser", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> },
  ];

  const subShapes = [
    { id: "triangle", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,3 2,21 22,21"/></svg> },
    { id: "rhombus", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 22,12 12,22 2,12"/></svg> },
    { id: "star", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg> },
    { id: "cloud", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19A4.5 4.5 0 0 0 22 14.5a4.4 4.4 0 0 0-3.3-4.3 6 6 0 0 0-11.4 0A4.4 4.4 0 0 0 4 14.5 4.5 4.5 0 0 0 8.5 19h9z"/></svg> },
  ];

  const moreShapesIndex = tools.findIndex((t) => t.id === "more-shapes");
  const moreShapesTop = 28 + (moreShapesIndex >= 0 ? moreShapesIndex : 11) * 38;

  // Calculate dynamic top offset for hovered tool card preview
  const hoveredIdx = tools.findIndex((t) => t.id === hoveredTool);
  const isSubShapeHovered = subShapes.some((s) => s.id === hoveredTool);

  let tooltipTop = 28;
  if (hoveredIdx >= 0) {
    tooltipTop = 28 + hoveredIdx * 38;
  } else if (isSubShapeHovered) {
    const subIdx = subShapes.findIndex((s) => s.id === hoveredTool);
    tooltipTop = moreShapesTop + 8 + subIdx * 38;
  } else if (hoveredTool === "undo") {
    tooltipTop = 28 + tools.length * 38 + 10;
  } else if (hoveredTool === "redo") {
    tooltipTop = 28 + (tools.length + 1) * 38 + 10;
  }

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
        // Sanitize snapshot records to avoid schema migration/validation crashes
        const sanitizedStore = {};
        Object.entries(lines.store).forEach(([key, record]) => {
          if (record && typeof record === "object") {
            const sanitized = { ...record };
            // Drop stale presence records to prevent old cursors from rendering
            if (sanitized.typeName === "instance_presence") {
              return;
            }
            // Ensure EVERY record has a meta object (required by newer schemas)
            if (sanitized.meta === undefined) {
              sanitized.meta = {};
            }
            // Ensure shape records have valid rotation
            if (sanitized.typeName === "shape" && sanitized.rotation === undefined) {
              sanitized.rotation = 0;
            }
            sanitizedStore[key] = sanitized;
          }
        });

        loadSnapshot(newStore, {
          ...lines,
          schema: newStore.schema.serialize(), // Force current schema to bypass brittle migrations
          store: sanitizedStore,
        });
      } catch (err) {
        console.warn("Could not load snapshot for slide, starting fresh. Error:", err);
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

  // Save toolbar positions
  useEffect(() => {
    localStorage.setItem(`toolbar-pos-${roomId}`, JSON.stringify(toolbarPos));
  }, [toolbarPos, roomId]);

  // Drag handlers for Toolbar
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

        const changes = event.changes;
        let hasShapeChanges = false;
        let hasPresenceChanges = false;
        let hasSocketChanges = false;

        // Scan added
        Object.values(changes.added).forEach((record) => {
          if (record.typeName === "shape" || record.typeName === "instance_presence") {
            hasSocketChanges = true;
            if (record.typeName === "shape") hasShapeChanges = true;
            if (record.typeName === "instance_presence") hasPresenceChanges = true;
          }
        });

        // Scan updated
        Object.values(changes.updated).forEach(([, to]) => {
          if (to.typeName === "shape" || to.typeName === "instance_presence") {
            hasSocketChanges = true;
            if (to.typeName === "shape") hasShapeChanges = true;
            if (to.typeName === "instance_presence") hasPresenceChanges = true;
          }
        });

        // Scan removed
        Object.keys(changes.removed).forEach((id) => {
          if (id.startsWith("shape:") || id.startsWith("instance_presence:")) {
            hasSocketChanges = true;
            if (id.startsWith("shape:")) hasShapeChanges = true;
            if (id.startsWith("instance_presence:")) hasPresenceChanges = true;
          }
        });

        // Broadcast cursor-only presence as volatile traffic; keep drawings reliable.
        if (hasSocketChanges) {
          const emitTarget = hasPresenceChanges && !hasShapeChanges && socket.volatile
            ? socket.volatile
            : socket;

          emitTarget.emit("tldraw-change", {
            roomId,
            slideId,
            changes,
          });
        }

        // Debounced autosave to MongoDB only for canvas shape changes
        if (hasShapeChanges) {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
            saveTimeoutRef.current = null; // Clear ref after firing
            const snapshot = editor.store.getStoreSnapshot();
            onDrawEnd(snapshot, slideId);
          }, AUTOSAVE_DELAY_MS);
        }
      },
      { scope: "all", source: "user" }
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
      const ownPresenceIds = editor.store
        .allRecords()
        .filter((record) => (
          record.typeName === "instance_presence" &&
          record.userId === editor.user.getRecordId()
        ))
        .map((record) => record.id);

      if (ownPresenceIds.length > 0) {
        socket.emit("tldraw-change", {
          roomId,
          slideId,
          changes: {
            added: {},
            updated: {},
            removed: Object.fromEntries(ownPresenceIds.map((id) => [id, true])),
          },
        });
      }

      socket.off("tldraw-change", handleRemoteChange);
      socket.off("sync-canvas", handleSyncCanvas);
      
      // Flush any pending unsaved drawings immediately on unmount or slide switch
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        try {
          const snapshot = editor.store.getStoreSnapshot();
          onDrawEnd(snapshot, slideId);
        } catch (e) {
          console.warn("Could not extract snapshot on unmount", e);
        }
      }
    };
  }, [store, slideId, roomId, socketRef, onDrawEnd, isEditorReady]);

  // ─── Sync active tool indicator & styles ─────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const interval = setInterval(() => {
      const tool = editor.getCurrentTool()?.id;
      if (tool && tool !== activeTool) setActiveTool(tool);
      handleStyleChange();
    }, 150);
    return () => clearInterval(interval);
  }, [activeTool, handleStyleChange]);

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
    if (["ellipse", "rectangle", "triangle", "rhombus", "star", "cloud"].includes(toolName)) {
      editor.run(() => {
        editor.setStyleForNextShapes(GeoShapeGeoStyle, toolName);
        editor.setCurrentTool("geo");
      });
      setActiveTool(toolName);
    } else if (toolName === "highlight") {
      editor.setCurrentTool("highlight");
      setActiveTool("highlight");
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
    highlight: {
      title: "Highlighter (Shift+D)",
      desc: "Draw semi-transparent marks. Perfect for highlighting work.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <path d="M 20 22 C 35 12, 65 32, 80 22" stroke="rgba(255, 230, 0, 0.45)" strokeWidth="12" fill="none" strokeLinecap="square" />
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
    rhombus: {
      title: "Rhombus / Diamond Shape",
      desc: "Insert rhombus/diamond shapes. Perfect for decisions in flowcharts.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <polygon points="50,8 70,22 50,36 30,22" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
        </svg>
      ),
    },
    star: {
      title: "Star Shape",
      desc: "Insert geometric star shapes with adjustable points.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <polygon points="50,6 59,18 73,18 62,26 66,39 50,30 34,39 38,26 27,18 41,18" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
        </svg>
      ),
    },
    cloud: {
      title: "Cloud Shape",
      desc: "Insert cloud shapes. Excellent for mockups and wireframes.",
      svg: (
        <svg width="100%" height="45" viewBox="0 0 100 45">
          <path d="M35,26 a6,6 0 0,1 6,-6 a8,8 0 0,1 15,-3 a6,6 0 0,1 10,6 a5,5 0 0,1 0,8 h-31 z" stroke="currentColor" strokeWidth="2" fill="none" className="animate-tut-stroke" />
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
        [class*="toolbar"] { display: none !important; }
        [class*="tlui-debug-panel"], [class*="tlui-status-bar"], [data-testid="debug-panel"], .tlui-helper-buttons { 
          display: none !important; 
        }
        /* Hide ALL native Tldraw bottom bar controls — we use our own CustomBottomBar */
        [class*="navigation-zone"],
        [class*="menu-zone"],
        [class*="minimap"],
        [data-testid^="minimap"],
        .tlui-navigation-panel,
        .tlui-menu-zone {
          display: none !important;
        }
        [class*="style-panel"] {
          position: static !important;
          transform: none !important;
          box-shadow: none !important;
          border: none !important;
          background: transparent !important;
          padding: 0 !important;
          width: 100% !important;
        }
        .flyout-hover-bridge::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: -12px;
          width: 12px;
          background: transparent;
        }
        .canvas-zoom-segment {
          height: 34px;
          width: 132px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }
        .canvas-zoom-button {
          height: 30px;
          width: 30px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.72;
          transition: background 140ms ease, opacity 140ms ease;
        }
        .canvas-zoom-button:hover { opacity: 1; }
        .canvas-zoom-value {
          height: 30px;
          min-width: 58px;
          padding: 0 9px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          transition: background 140ms ease;
        }
        .canvas-quick-action-button {
          height: 34px;
          min-width: 34px;
          padding: 0 11px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          transition: background 140ms ease, color 140ms ease, transform 140ms ease;
        }
        .canvas-quick-action-button:hover { transform: translateY(-1px); }
        .canvas-quick-action-button:active { transform: translateY(0) scale(0.98); }
        .canvas-theme-toggle-button {
          height: 34px;
          padding: 0 10px 0 8px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          transition: background 140ms ease, color 140ms ease, transform 140ms ease;
        }
        .canvas-theme-toggle-button:hover { transform: translateY(-1px); }
        .canvas-theme-toggle-track {
          width: 36px;
          height: 18px;
          border-radius: 999px;
          padding: 2px;
          display: inline-flex;
          align-items: center;
          transition: background 160ms ease;
        }
        .canvas-theme-toggle-thumb {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), background 160ms ease;
        }
        @media (max-width: 640px) {
          .canvas-quick-action-button span { display: none; }
          .canvas-quick-action-button { padding: 0 9px; }
          .canvas-theme-toggle-button > span:last-child { display: none; }
        }
      `}} />

      {/* Draggable Toolbar (Hidden for Viewers) */}
      {!isReadonly && (
        <div
          className="fixed z-[100] flex flex-col items-start select-none"
          style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px`, pointerEvents: "all" }}
        >
        {/* Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-11 h-4 rounded-t-[14px] flex items-center justify-center border-t border-x cursor-grab active:cursor-grabbing transition-colors backdrop-blur-xl ${
            isDark ? "bg-[#111113]/92 border-white/10 text-white/25 hover:text-white/60" : "bg-white/95 border-neutral-200 text-neutral-400 hover:text-neutral-600"
          } ${isDragging ? "cursor-grabbing" : ""}`}
        >
          <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor">
            <circle cx="2" cy="2" r="1" /><circle cx="7" cy="2" r="1" /><circle cx="12" cy="2" r="1" />
          </svg>
        </div>

        {/* Tool Buttons */}
        <div className={`w-11 border p-1.5 flex flex-col gap-1 items-center rounded-b-[14px] backdrop-blur-xl shadow-2xl ${
          isDark ? "bg-[#111113]/92 border-white/10 text-white shadow-black/50" : "bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-300/40"
        }`}>
          {tools.map(({ id, icon }) => {
            const isGroup = id === "more-shapes";
            const isSubShapeActive = ["triangle", "rhombus", "star", "cloud"].includes(activeTool);
            const isActive = isGroup ? isSubShapeActive : (activeTool === id || activeTool === `${id}.idle`);

            return (
              <button
                key={id}
                onClick={() => {
                  if (isGroup) {
                    setShowShapesMenu(!showShapesMenu);
                  } else {
                    selectTool(id);
                    setShowShapesMenu(false);
                  }
                }}
                onMouseEnter={() => {
                  setHoveredTool(id);
                  if (isGroup) setShowShapesMenu(true);
                }}
                onMouseLeave={() => {
                  setHoveredTool(null);
                  if (isGroup) setShowShapesMenu(false);
                }}
                title={isGroup ? "More Shapes" : id}
                className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-[#007aff] text-white shadow-[0_2px_8px_rgba(0,122,255,0.4)]"
                    : isDark ? "hover:bg-white/8 text-white/70 hover:text-white" : "hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {icon}
              </button>
            );
          })}

          <div className={`h-px w-6 my-0.5 ${isDark ? "bg-white/10" : "bg-neutral-200"}`} />

          <button
            onClick={() => editorRef.current?.undo()}
            onMouseEnter={() => setHoveredTool("undo")}
            onMouseLeave={() => setHoveredTool(null)}
            className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all ${
              isDark ? "hover:bg-white/8 text-white/50 hover:text-white" : "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button
            onClick={() => editorRef.current?.redo()}
            onMouseEnter={() => setHoveredTool("redo")}
            onMouseLeave={() => setHoveredTool(null)}
            className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all ${
              isDark ? "hover:bg-white/8 text-white/50 hover:text-white" : "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          </button>
        </div>

        {/* Flyout Sub-menu for Shapes */}
        {showShapesMenu && (
          <div
            onMouseEnter={() => setShowShapesMenu(true)}
            onMouseLeave={() => setShowShapesMenu(false)}
            className={`absolute left-12 w-11 border p-1.5 flex flex-col gap-1 items-center rounded-xl shadow-2xl backdrop-blur-xl flyout-hover-bridge ${
            isDark ? "bg-[#111113]/92 border-white/10" : "bg-white/95 border-neutral-200"
          }`}
            style={{ top: `${moreShapesTop}px` }}
          >
            {subShapes.map((sub) => {
              const isActive = activeTool === sub.id || activeTool === `${sub.id}.idle`;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    selectTool(sub.id);
                    setShowShapesMenu(false);
                  }}
                  onMouseEnter={() => setHoveredTool(sub.id)}
                  onMouseLeave={() => setHoveredTool(null)}
                  className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-[#007aff] text-white shadow-[0_2px_8px_rgba(0,122,255,0.4)]"
                      : isDark ? "hover:bg-white/8 text-white/60 hover:text-white" : "hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900"
                  }`}
                  title={sub.id}
                >
                  {sub.icon}
                </button>
              );
            })}
          </div>
        )}

        {/* Tutorial card on hover - dynamically positioned vertically next to the hovered button */}
        {hoveredTool && toolTutorials[hoveredTool] && (
          <div 
            style={{ top: `${tooltipTop}px`, left: isSubShapeHovered ? "110px" : "56px" }}
            className={`absolute w-60 p-4 border rounded-2xl shadow-2xl flex flex-col gap-2.5 backdrop-blur-xl transition-all duration-150 ${
            isDark ? "bg-[#111113]/95 border-white/10 text-white" : "bg-white/95 border-neutral-200 text-neutral-800"
          }`}
          >
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
      )}

      {/*
        Pass the pre-populated store directly to Tldraw.
        Tldraw initializes with our saved data already loaded — no timing issues.
        This is the official tldraw persistence pattern for custom backends.
      */}
      <Tldraw
        store={store}
        isReadonly={isReadonly}
        components={{
          Toolbar: () => null,
          HelperButtons: () => null,
          DebugPanel: () => null,
          DebugMenu: () => null,
          SharePanel: () => null,
          NavigationPanel: () => null,
          PageMenu: () => null,
          // Inject our bottom bar inside Tldraw's context (needs useEditor/useActions hooks)
          InFrontOfTheCanvas: () => <CustomBottomBar isDark={isDark} />,
          StylePanel: () => isReadonly ? null : (
            <div
              className={`fixed z-[100] top-[70px] right-4 sm:right-6 w-full max-w-[280px] sm:w-[280px] p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border transition-all duration-300 ease-out select-none flex flex-col gap-5 ${
                isDark 
                  ? "bg-[#111113]/80 border-white/10 text-white shadow-black/50" 
                  : "bg-white/90 border-neutral-200 text-neutral-800 shadow-neutral-200/50"
              }`}
              style={{
                pointerEvents: "all",
                transform: isChatOpen ? "translateX(-320px)" : "translateX(0px)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-inherit/10">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-80">Style</h3>
              </div>

              {/* 1. Color Grid */}
              <div className="flex flex-col gap-2.5">
                <span className={`text-[10px] font-semibold tracking-wide ${isDark ? "text-white/40" : "text-neutral-400"}`}>Color</span>
                <div className="grid grid-cols-5 gap-2.5">
                  {[
                    { id: "black", value: "#1e293b" },
                    { id: "grey", value: "#64748b" },
                    { id: "red", value: "#ef4444" },
                    { id: "orange", value: "#f97316" },
                    { id: "yellow", value: "#eab308" },
                    { id: "green", value: "#22c55e" },
                    { id: "light-blue", value: "#06b6d4" },
                    { id: "blue", value: "#3b82f6" },
                    { id: "violet", value: "#8b5cf6" },
                    { id: "pink", value: "#ec4899" }
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setStyle(DefaultColorStyle, c.id)}
                      className={`w-8 h-8 rounded-xl border-[2.5px] transition-all duration-200 relative flex items-center justify-center hover:scale-110 active:scale-95 ${
                        activeStyles.color === c.id 
                          ? isDark ? "border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]" : "border-neutral-900 shadow-md" 
                          : "border-transparent shadow-sm"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.id}
                    >
                      {activeStyles.color === c.id && (
                        <div className={`w-2 h-2 rounded-full ${c.id === 'black' && !isDark ? 'bg-white/80' : 'bg-white'} shadow-sm`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Stroke / Size Section */}
              <div className="flex flex-col gap-2.5">
                <span className={`text-[10px] font-semibold tracking-wide ${isDark ? "text-white/40" : "text-neutral-400"}`}>Stroke</span>
                <div className={`flex rounded-xl p-1 gap-1 ${isDark ? "bg-white/5" : "bg-neutral-100"}`}>
                  {[
                    { id: "s", label: "S", weight: "2px" },
                    { id: "m", label: "M", weight: "4px" },
                    { id: "l", label: "L", weight: "6px" },
                    { id: "xl", label: "XL", weight: "8px" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(DefaultSizeStyle, s.id)}
                      className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-10 rounded-lg transition-all text-[9px] font-bold ${
                        activeStyles.size === s.id
                          ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-black shadow-sm"
                          : isDark ? "text-white/50 hover:bg-white/5 hover:text-white" : "text-neutral-500 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      <div className="w-4 rounded-full bg-current" style={{ height: s.weight }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Dash Section */}
              <div className="flex flex-col gap-2.5">
                <span className={`text-[10px] font-semibold tracking-wide ${isDark ? "text-white/40" : "text-neutral-400"}`}>Line Style</span>
                <div className={`flex rounded-xl p-1 gap-1 ${isDark ? "bg-white/5" : "bg-neutral-100"}`}>
                  {[
                    { id: "draw", label: "Draw", render: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14c2-2 4-4 8-4s6 2 8 4"/></svg> },
                    { id: "solid", label: "Solid", render: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16"/></svg> },
                    { id: "dashed", label: "Dash", render: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h3M10 12h4M17 12h3"/></svg> },
                    { id: "dotted", label: "Dot", render: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg> }
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setStyle(DefaultDashStyle, d.id)}
                      className={`flex-1 flex items-center justify-center h-10 rounded-lg transition-all ${
                        activeStyles.dash === d.id
                          ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-black shadow-sm"
                          : isDark ? "text-white/50 hover:bg-white/5 hover:text-white" : "text-neutral-500 hover:bg-black/5 hover:text-black"
                      }`}
                      title={d.label}
                    >
                      {d.render}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Fill Section */}
              <div className="flex flex-col gap-2.5">
                <span className={`text-[10px] font-semibold tracking-wide ${isDark ? "text-white/40" : "text-neutral-400"}`}>Fill</span>
                <div className={`flex rounded-xl p-1 gap-1 ${isDark ? "bg-white/5" : "bg-neutral-100"}`}>
                  {[
                    { id: "none", label: "None" },
                    { id: "semi", label: "Semi" },
                    { id: "solid", label: "Solid" },
                    { id: "pattern", label: "Pattern" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setStyle(DefaultFillStyle, f.id)}
                      className={`flex-1 text-[10px] font-bold h-9 rounded-lg transition-all ${
                        activeStyles.fill === f.id
                          ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-black shadow-sm"
                          : isDark ? "text-white/50 hover:bg-white/5 hover:text-white" : "text-neutral-500 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        }}
        onMount={(editorInstance) => {
          editorRef.current = editorInstance;
          setIsEditorReady(true);

          // Apply theme and user display name preferences
          const userId = currentUser?._id || currentUser?.id || fallbackUserIdRef.current;
          editorInstance.user.updateUserPreferences({
            id: userId,
            color: getPresenceColor(userId),
            colorScheme: isDark ? "dark" : "light",
            name: currentUser?.username || "Guest",
          });
          setTimeout(() => {
            if (editorInstance && !editorInstance.isDisposed) {
              try {
                window.dispatchEvent(new Event("resize"));
                editorInstance.updateViewportScreenBounds();
              } catch (e) {
                // ignore potential sizing errors during rapid lifecycle changes
               }
            }
          }, 100);
        }}
      />
    </div>
  );
}

export default Canvas;
