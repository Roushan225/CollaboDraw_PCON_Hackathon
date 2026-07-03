import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Canvas from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import useSocket from "../hooks/useSocket";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

// Simple Component to render vector previews of slides in a square card
function SlidePreviewCard({ slide, isActive, onClick, onDelete, theme }) {
  const isDark = theme === "dark";
  const { name, drawingData } = slide;

  // Define styling classes
  const cardBorder = isActive
    ? (isDark ? "border-white ring-2 ring-white/10" : "border-neutral-900 ring-2 ring-black/5")
    : (isDark ? "border-white/10 hover:border-white/30" : "border-neutral-200 hover:border-neutral-400 bg-white");
  
  const textBg = isDark ? "bg-black/60 text-white/70" : "bg-neutral-100/80 text-neutral-800";
  const canvasBg = isDark ? "bg-[#141416]" : "bg-neutral-50";

  return (
    <div
      onClick={onClick}
      className={`w-[72px] h-[72px] rounded-xl border flex flex-col relative overflow-hidden transition-all duration-200 cursor-pointer select-none shrink-0 group ${cardBorder} ${canvasBg}`}
    >
      {/* Dynamic Mini SVG drawing preview */}
      <svg viewBox="0 0 1600 1000" className="w-full h-[52px] pointer-events-none p-1.5 opacity-80">
        {drawingData?.map((shape, idx) => {
          const color = shape.color === "#ffffff" && !isDark ? "#d4d4d8" : shape.color;
          const strokeWidth = Math.max(8, shape.strokeWidth * 1.5);

          if (shape.tool === "pen" || shape.tool === "eraser") {
            const pointsStr = shape.points?.reduce((acc, val, i) => {
              return acc + (i % 2 === 0 ? `${val},` : `${val} `);
            }, "");
            return (
              <polyline
                key={idx}
                points={pointsStr}
                fill="none"
                stroke={shape.tool === "eraser" ? (isDark ? "#141416" : "#f5f5f5") : color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          } else if (shape.tool === "rectangle") {
            return (
              <rect
                key={idx}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                rx={10}
              />
            );
          } else if (shape.tool === "circle") {
            return (
              <circle
                key={idx}
                cx={shape.x}
                cy={shape.y}
                r={shape.radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
              />
            );
          } else if (shape.tool === "arrow" || shape.tool === "line") {
            return (
              <line
                key={idx}
                x1={shape.points[0]}
                y1={shape.points[1]}
                x2={shape.points[2]}
                y2={shape.points[3]}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          } else if (shape.tool === "text") {
            return (
              <text
                key={idx}
                x={shape.x}
                y={shape.y + 20}
                fill={color}
                fontSize={64}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                T
              </text>
            );
          }
          return null;
        })}
      </svg>

      {/* Tiny Slide Label Panel */}
      <div className={`h-5 flex items-center justify-between px-2 text-[9px] font-bold tracking-tight absolute bottom-0 left-0 right-0 ${textBg}`}>
        <span className="truncate max-w-[45px]">{name}</span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-[9px] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0"
            title="Delete slide"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function DrawingRoom() {
  const { roomId } = useParams();
  const socketRef = useSocket();
  const { user } = useAuth();
  
  // Dynamic theme matching (Lighter white vs Neutral Black)
  const [theme] = useState(() => localStorage.getItem("theme") || "dark");
  const isDark = theme === "dark";

  // Project details state
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectError, setProjectError] = useState("");

  // Slide state array
  const [slides, setSlides] = useState([]);
  const [activeSlideId, setActiveSlideId] = useState("");

  // Drawing tools state
  const [color, setColor] = useState(isDark ? "#ffffff" : "#000000"); // default matching color
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [tool, setTool] = useState("pen");
  const [lines, setLines] = useState([]);

  // Invite state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch project details and slides on load
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const res = await api.get(`/projects/${roomId}`);
        const proj = res.data.project;
        setProject(proj);
        setSlides(proj.slides || []);
        
        if (proj.slides && proj.slides.length > 0) {
          setActiveSlideId(proj.slides[0].slideId);
          setLines(proj.slides[0].drawingData || []);
        }
      } catch (err) {
        setProjectError(err?.response?.data?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetails();
  }, [roomId]);

  // Handle Socket.io connections & synchronization events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !project) return;

    socket.emit("join-room", roomId);

    socket.on("connect", () => {
      socket.emit("join-room", roomId);
    });

    // Sync slide list when modified by another user
    socket.on("update-slides", (updatedSlides) => {
      setSlides(updatedSlides);
      
      const stillExists = updatedSlides.some(s => s.slideId === activeSlideId);
      if (!stillExists && updatedSlides.length > 0) {
        const fallback = updatedSlides[0];
        setActiveSlideId(fallback.slideId);
        setLines(fallback.drawingData || []);
      } else {
        const activeObj = updatedSlides.find(s => s.slideId === activeSlideId);
        if (activeObj) setLines(activeObj.drawingData || []);
      }
    });

    // Remote user switched slide
    socket.on("switch-slide", ({ slideId }) => {
      setActiveSlideId(slideId);
      setSlides(currSlides => {
        const slideObj = currSlides.find(s => s.slideId === slideId);
        if (slideObj) setLines(slideObj.drawingData || []);
        return currSlides;
      });
    });

    // Remote user synced drawing canvas
    socket.on("sync-canvas", ({ slideId: incomingSlideId, canvasData }) => {
      if (incomingSlideId === activeSlideId) {
        setLines(canvasData);
      }
      // Update local slide drawing data array immediately for card rendering
      setSlides(prev => prev.map(s => {
        if (s.slideId === incomingSlideId) {
          return { ...s, drawingData: canvasData };
        }
        return s;
      }));
    });

    return () => {
      socket.off("connect");
      socket.off("update-slides");
      socket.off("switch-slide");
      socket.off("sync-canvas");
    };
  }, [roomId, socketRef, project, activeSlideId]);

  // Switch slide helper
  const handleSwitchSlide = (slideId) => {
    setActiveSlideId(slideId);
    const targetSlide = slides.find(s => s.slideId === slideId);
    setLines(targetSlide ? targetSlide.drawingData || [] : []);

    // Broadcast switch event
    socketRef.current?.emit("switch-slide", {
      roomId,
      slideId,
      username: user?.username,
    });
  };

  // Add a new slide
  const handleAddSlide = async () => {
    try {
      const res = await api.post(`/projects/${roomId}/slides`, {
        name: `Slide ${slides.length + 1}`,
      });
      const newSlides = res.data.slides;
      setSlides(newSlides);
      
      setActiveSlideId(res.data.slideId);
      setLines([]);

      // Broadcast changes
      socketRef.current?.emit("update-slides", { roomId, slides: newSlides });
    } catch (err) {
      console.error("Failed to add slide", err);
    }
  };

  // Delete a slide
  const handleDeleteSlide = async (slideId) => {
    if (slides.length <= 1) return;
    try {
      const res = await api.delete(`/projects/${roomId}/slides/${slideId}`);
      const newSlides = res.data.slides;
      setSlides(newSlides);

      if (activeSlideId === slideId) {
        const fallbackId = newSlides[0].slideId;
        setActiveSlideId(fallbackId);
        const fallbackSlide = newSlides.find(s => s.slideId === fallbackId);
        setLines(fallbackSlide ? fallbackSlide.drawingData || [] : []);
      }

      // Broadcast changes
      socketRef.current?.emit("update-slides", { roomId, slides: newSlides });
    } catch (err) {
      console.error("Failed to delete slide", err);
    }
  };

  // Rename a slide prompt
  const handleRenameSlide = (slide) => {
    const newName = prompt("Enter new slide name:", slide.name);
    if (newName && newName.trim()) {
      api.put(`/projects/${roomId}/slides/${slide.slideId}`, { name: newName.trim() })
        .then(res => {
          setSlides(res.data.slides);
          socketRef.current?.emit("update-slides", { roomId, slides: res.data.slides });
        });
    }
  };

  // Autosave active slide drawing lines back to Mongo
  const saveDrawingToBackend = async (updatedLines) => {
    try {
      await api.post(`/projects/${roomId}/save`, {
        slideId: activeSlideId,
        drawingData: updatedLines,
      });

      // Update local slide drawing data array immediately for card rendering
      setSlides(prev => prev.map(s => {
        if (s.slideId === activeSlideId) {
          return { ...s, drawingData: updatedLines };
        }
        return s;
      }));
    } catch (err) {
      console.error("Autosave slide error", err);
    }
  };

  // Handle clear active canvas lines
  const handleClear = () => {
    setLines([]);
    socketRef.current?.emit("clear-canvas", { roomId, slideId: activeSlideId });
    saveDrawingToBackend([]);
  };

  // Search members debounced
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await api.get(`/users/search?q=${searchQuery}`);
        setSearchResults(res.data.users);
      } catch (err) {
        console.error("Search users error", err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Invite member
  const handleInvite = async (targetUsername) => {
    setInviteError("");
    setInviteSuccess("");
    setInviteLoading(true);
    try {
      const res = await api.post(`/projects/${roomId}/invite`, { username: targetUsername });
      setProject(res.data.project);
      setInviteSuccess(res.data.message);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      setInviteError(err?.response?.data?.message || "Invitation failed");
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-6">
        <span className="text-4xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-white/40 text-sm mb-6 text-center max-w-sm">{projectError}</p>
        <Link to="/" className="bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isCreator = project.creator?._id === user?.id || project.creator === user?.id;

  // Theme variables colors
  const bgClass = isDark ? "bg-[#0b0b0d] text-white" : "bg-[#f5f5f7] text-neutral-900";
  const barBgClass = isDark ? "bg-black/90 border-white/10" : "bg-white border-neutral-200 shadow-sm";
  const textMutedClass = isDark ? "text-white/40" : "text-neutral-500";
  const borderClass = isDark ? "border-white/10" : "border-neutral-200";

  return (
    <div className={`min-h-screen flex flex-col overflow-hidden transition-colors duration-300 ${bgClass}`}>
      
      {/* Header Bar (Increased height to h-24 & padded to px-8 for premium room layout) */}
      <header className={`border-b h-24 shrink-0 px-8 flex items-center justify-between transition-colors duration-300 relative z-20 ${barBgClass}`}>
        
        {/* Left Side: Back action & Project Details */}
        <div className="flex items-center gap-4">
          <Link to="/" className={`hover:scale-105 transition-transform ${isDark ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-800"}`} title="Back to Dashboard">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 9H3M3 9L8 4M3 9L8 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className={`h-4 w-px ${isDark ? "bg-white/10" : "bg-neutral-200"}`} />
          
          <div>
            <h1 className="font-extrabold text-sm tracking-tight">{project.name}</h1>
            <p className={`text-[10px] ${textMutedClass}`}>ID: {project.projectId}</p>
          </div>
        </div>

        {/* Right Side: Square Slide cards row + Members & Invites */}
        <div className="flex items-center gap-6">
          
          {/* Horizontal Slide Cards Row */}
          <div className="flex items-center gap-2.5 overflow-x-auto max-w-lg py-1">
            {slides.map((slide) => (
              <SlidePreviewCard
                key={slide.slideId}
                slide={slide}
                isActive={slide.slideId === activeSlideId}
                onClick={() => handleSwitchSlide(slide.slideId)}
                onDelete={slides.length > 1 ? () => handleDeleteSlide(slide.slideId) : null}
                theme={theme}
              />
            ))}

            {/* Large + Icon Card to Create New Slide */}
            <button
              onClick={handleAddSlide}
              className={`flex items-center justify-center w-[72px] h-[72px] rounded-xl border text-xl font-bold transition-all duration-150 ${
                isDark
                  ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  : "bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-sm"
              }`}
              title="Add New Slide"
            >
              +
            </button>
          </div>

          <div className={`h-8 w-px ${isDark ? "bg-white/15" : "bg-neutral-200"}`} />

          {/* Members & Invites */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5 overflow-hidden">
              {project.members?.map((member, idx) => (
                <div
                  key={member._id || idx}
                  title={member.username}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 ${
                    isDark ? "bg-neutral-800 border-black text-white/80" : "bg-neutral-100 border-white text-neutral-700 shadow-sm"
                  }`}
                >
                  {member.username?.[0]?.toUpperCase()}
                </div>
              ))}
            </div>

            {isCreator && (
              <div className="relative">
                <button
                  onClick={() => setShowInviteModal(!showInviteModal)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full hover:scale-105 active:scale-95 transition-all duration-150 flex items-center gap-1 ${
                    isDark ? "bg-white text-black hover:bg-white/90" : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
                  }`}
                >
                  <span>+ Invite</span>
                </button>

                {showInviteModal && (
                  <div className={`absolute right-0 top-11 w-80 border rounded-2xl p-5 shadow-2xl z-30 transition-colors duration-300 ${
                    isDark ? "bg-[#0d0d0f] border-white/10 text-white" : "bg-white border-neutral-200 text-neutral-900"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-sm">Invite Collaborator</h3>
                      <button
                        onClick={() => { setShowInviteModal(false); setInviteError(""); setInviteSuccess(""); }}
                        className={`text-xs transition-colors ${isDark ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-800"}`}
                      >
                        ✕
                      </button>
                    </div>
                    <p className={`text-[10px] mb-4 ${textMutedClass}`}>Search usernames to add them to this drawing canvas.</p>

                    {inviteError && <div className="mb-3 text-[10px] text-red-400 bg-red-950/20 border border-red-900/50 p-2 rounded-lg">{inviteError}</div>}
                    {inviteSuccess && <div className="mb-3 text-[10px] text-green-400 bg-green-950/20 border border-green-900/50 p-2 rounded-lg">{inviteSuccess}</div>}

                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        placeholder="Search username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-white/30 ${
                          isDark ? "bg-white/5 border-white/10 text-white" : "bg-neutral-50 border-neutral-200 text-neutral-900"
                        }`}
                      />

                      {searchResults.length > 0 && (
                        <div className={`border rounded-xl max-h-36 overflow-y-auto divide-y ${
                          isDark ? "border-white/10 bg-white/[0.02] divide-white/5" : "border-neutral-200 bg-neutral-50 divide-neutral-200"
                        }`}>
                          {searchResults.map((u) => (
                            <div key={u._id} className="p-2 flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium">{u.username}</span>
                              <button
                                onClick={() => handleInvite(u.username)}
                                disabled={inviteLoading}
                                className={`text-[9px] font-bold px-2.5 py-0.5 rounded hover:opacity-90 ${
                                  isDark ? "bg-white text-black" : "bg-neutral-950 text-white"
                                }`}
                              >
                                Invite
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                        <p className="text-center text-[10px] text-white/30 py-1">No matching users found</p>
                      )}

                      <div className={`mt-3 pt-3 border-t ${isDark ? "border-white/10" : "border-neutral-200"}`}>
                        <p className={`text-[9px] font-semibold uppercase tracking-wider mb-2 ${textMutedClass}`}>Current members</p>
                        <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
                          {project.members.map((m) => (
                            <div key={m._id} className="flex items-center gap-2 text-[11px]">
                              <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                isDark ? "bg-white/10 text-white/60" : "bg-neutral-200 text-neutral-700"
                              }`}>
                                {m.username?.[0]?.toUpperCase()}
                              </div>
                              <span>{m.username}</span>
                              {m._id === project.creator?._id && <span className={`text-[7px] border px-1 rounded ml-auto ${
                                isDark ? "border-white/10 bg-white/5 text-white/30" : "border-neutral-200 bg-neutral-50 text-neutral-400"
                              }`}>Creator</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Floating Canvas Area (Dynamic background matching active theme) */}
      <main className={`flex-1 relative overflow-hidden flex items-center justify-start md:pl-20 transition-colors duration-300 ${
        isDark ? "bg-[#0c0c0e]" : "bg-[#f5f5f7]"
      }`}>
        <Toolbar
          color={color}
          setColor={setColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          tool={tool}
          setTool={setTool}
          onClear={handleClear}
        />

        <Canvas
          socketRef={socketRef}
          roomId={roomId}
          slideId={activeSlideId}
          color={color}
          strokeWidth={strokeWidth}
          tool={tool}
          lines={lines}
          setLines={setLines}
          onDrawEnd={saveDrawingToBackend}
          theme={theme}
        />
      </main>
    </div>
  );
}
