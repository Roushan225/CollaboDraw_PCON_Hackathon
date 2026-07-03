import { useState, useEffect } from "react";

function Toolbar({ color, setColor, strokeWidth, setStrokeWidth, tool, setTool, onClear }) {
  const [showOptions, setShowOptions] = useState(false);
  const colors = ["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#000000"];

  const isDark = (localStorage.getItem("theme") || "dark") === "dark";

  // Theme matching styles
  const blockBg = isDark ? "bg-[#0c0c0e]/95 border-white/10 shadow-2xl" : "bg-white/95 border-neutral-200 shadow-md";
  const activeClass = isDark ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-900";
  const hoverClass = isDark ? "hover:bg-white/5 text-white/50 hover:text-white" : "hover:bg-neutral-50 text-neutral-400 hover:text-neutral-900";
  const borderClass = isDark ? "border-white/10" : "border-neutral-200";
  const textMuted = isDark ? "text-white/40" : "text-neutral-400";

  // Detailed tools with tooltips and usage instructions
  const tools = [
    { id: "select",    icon: "↗",  shortcut: "V", label: "Select",    desc: "Select and pan around the workspace" },
    { id: "rectangle", icon: "▢",  shortcut: "R", label: "Rectangle", desc: "Click and drag to draw a rectangle" },
    { id: "circle",    icon: "◯",  shortcut: "O", label: "Circle",    desc: "Click and drag to draw a circle" },
    { id: "arrow",     icon: "➔",  shortcut: "A", label: "Arrow",     desc: "Drag to draw directional arrows" },
    { id: "line",      icon: "╱",  shortcut: "L", label: "Line",      desc: "Drag to draw a straight line" },
    { id: "pen",       icon: "✏️", shortcut: "D", label: "Pen",       desc: "Freehand drawing and sketching" },
    { id: "text",      icon: "𝖳",  shortcut: "T", label: "Text",      desc: "Click on canvas to type text" },
    { id: "eraser",    icon: "🧹", shortcut: "E", label: "Eraser",    desc: "Erase strokes and shapes" },
  ];

  // Implement physical keyboard shortcuts for high fidelity
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keypresses if user is typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
      
      const key = e.key.toUpperCase();
      const matchedTool = tools.find(t => t.shortcut === key);
      if (matchedTool) {
        setTool(matchedTool.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool]);

  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3 items-center">
      
      {/* Block 1: Plus (Insert / Color Options Toggle) */}
      <div className={`border rounded-2xl p-1.5 flex flex-col items-center ${blockBg}`}>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light transition-all duration-150 relative ${
            showOptions ? activeClass : hoverClass
          }`}
          title="Insert Options (+) - Change color and size"
        >
          <span>+</span>
          <span className="absolute bottom-0.5 right-1.5 text-[6px] opacity-30 font-mono">/</span>
        </button>
      </div>

      {/* Block 2: AI / Co-pilot */}
      <div className={`border rounded-2xl p-1.5 flex flex-col items-center ${blockBg}`}>
        <button
          onClick={() => alert("AI Diagramming Co-pilot: Write a prompt to generate diagrams coming soon!")}
          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center transition-all duration-150 ${hoverClass}`}
          title="AI Co-pilot (⌘J) - Ask AI to draft shapes"
        >
          <span className="text-xs">✨</span>
          <span className="text-[6px] opacity-30 font-mono -mt-0.5">⌘J</span>
        </button>
      </div>

      {/* Block 3: Main Toolbar items */}
      <div className={`border rounded-2xl p-1.5 flex flex-col items-center gap-1 ${blockBg}`}>
        {tools.map((t) => {
          const isActive = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center transition-all duration-150 relative ${
                isActive ? activeClass : hoverClass
              }`}
              // Reflected Tool Name + Usage on Hover
              title={`${t.label} (${t.shortcut}) \nUsage: ${t.desc}`}
            >
              <span className="text-[13px] font-medium leading-none">{t.icon}</span>
              <span className="text-[6.5px] opacity-35 font-mono absolute bottom-0.5 right-1.5">{t.shortcut}</span>
            </button>
          );
        })}
      </div>

      {/* Block 4: Comments and Clear Canvas action */}
      <div className={`border rounded-2xl p-1.5 flex flex-col items-center gap-1 ${blockBg}`}>
        <button
          onClick={() => alert("Comments and annotations coming soon!")}
          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center transition-all duration-150 ${hoverClass}`}
          title="Comments (C) - Leave feedback notes"
        >
          <span className="text-[11px]">💬</span>
          <span className="text-[6px] opacity-30 font-mono">C</span>
        </button>
        <button
          onClick={onClear}
          className="w-9 h-9 rounded-xl flex flex-col items-center justify-center hover:bg-red-500/10 text-red-500 transition-all duration-150"
          title="Clear canvas - Delete all strokes on this slide"
        >
          <span className="text-[11px]">🗑</span>
        </button>
      </div>

      {/* Slide-out options panel (Colors & Brush size) */}
      {showOptions && (
        <div className={`absolute left-16 top-0 border rounded-2xl p-4 w-52 flex flex-col gap-4 backdrop-blur-xl transition-all duration-300 ${blockBg}`}>
          {/* Colors swatches */}
          <div>
            <span className={`block text-[10px] uppercase font-bold tracking-wider mb-2.5 ${textMuted}`}>Color</span>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                    color === c ? (isDark ? "border-white scale-110" : "border-black scale-110") : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className={`h-px ${borderClass}`} />

          {/* Stroke Width Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${textMuted}`}>Brush size</span>
              <span className="text-xs font-mono font-bold">{strokeWidth}px</span>
            </div>
            <input
              type="range"
              min="2"
              max="30"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-neutral-700 accent-neutral-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Toolbar;
