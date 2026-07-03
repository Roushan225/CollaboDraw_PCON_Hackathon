// Toolbar.jsx — color picker, brush size, eraser, clear button

function Toolbar({ color, setColor, strokeWidth, setStrokeWidth, tool, setTool, onClear }) {
  const colors = ["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#000000"];

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-xl flex-wrap">
      {/* Color swatches */}
      <div className="flex gap-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => { setColor(c); setTool("pen"); }}
            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
              color === c && tool === "pen" ? "border-white scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600" />

      {/* Brush size */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Size</span>
        <input
          type="range"
          min="2"
          max="30"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-24 accent-blue-500"
        />
        <span className="text-sm text-gray-400 w-6">{strokeWidth}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600" />

      {/* Eraser */}
      <button
        onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
          tool === "eraser"
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
      >
        {tool === "eraser" ? "✏️ Pen" : "🧹 Eraser"}
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        className="px-3 py-1 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
      >
        🗑 Clear
      </button>
    </div>
  );
}

export default Toolbar;
