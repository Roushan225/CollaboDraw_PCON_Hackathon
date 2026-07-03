import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Canvas from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import useSocket from "../hooks/useSocket";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function DrawingRoom() {
  const { roomId } = useParams();
  const socketRef = useSocket();
  const { user } = useAuth();
  
  // Theme check from local storage
  const [theme] = useState(() => localStorage.getItem("theme") || "dark");
  const isDark = theme === "dark";

  // Project data
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectError, setProjectError] = useState("");

  // Slides state
  const [slides, setSlides] = useState([]);
  const [activeSlideId, setActiveSlideId] = useState("");
  const [editingSlideId, setEditingSlideId] = useState("");
  const [editName, setEditName] = useState("");

  // Canvas drawing state
  const [color, setColor] = useState("#ffffff");
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
        
        // Default to first slide
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
      
      // If our active slide got deleted, switch to the first remaining slide
      const stillExists = updatedSlides.some(s => s.slideId === activeSlideId);
      if (!stillExists && updatedSlides.length > 0) {
        const fallback = updatedSlides[0];
        setActiveSlideId(fallback.slideId);
        setLines(fallback.drawingData || []);
      } else {
        // Update lines of active slide if they changed
        const activeObj = updatedSlides.find(s => s.slideId === activeSlideId);
        if (activeObj) setLines(activeObj.drawingData || []);
      }
    });

    // Remote user switched slide
    socket.on("switch-slide", ({ slideId }) => {
      setActiveSlideId(slideId);
      // Retrieve drawing lines of new active slide
      setSlides(currSlides => {
        const slideObj = currSlides.find(s => s.slideId === slideId);
        if (slideObj) setLines(slideObj.drawingData || []);
        return currSlides;
      });
    });

    return () => {
      socket.off("connect");
      socket.off("update-slides");
      socket.off("switch-slide");
    };
  }, [roomId, socketRef, project, activeSlideId]);

  // Update canvas lines locally when switching activeSlideId
  const handleSwitchSlide = (slideId) => {
    setActiveSlideId(slideId);
    const targetSlide = slides.find(s => s.slideId === slideId);
    setLines(targetSlide ? targetSlide.drawingData || [] : []);

    // Broadcast switch event to other users
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
      
      // Auto-switch to newly created slide
      setActiveSlideId(res.data.slideId);
      setLines([]);

      // Broadcast changes
      socketRef.current?.emit("update-slides", { roomId, slides: newSlides });
    } catch (err) {
      console.error("Failed to add slide", err);
    }
  };

  // Delete a slide
  const handleDeleteSlide = async (slideId, e) => {
    e.stopPropagation(); // Avoid switching to slide on click
    if (slides.length <= 1) return;
    try {
      const res = await api.delete(`/projects/${roomId}/slides/${slideId}`);
      const newSlides = res.data.slides;
      setSlides(newSlides);

      // If we deleted the active slide, switch active selection to first remaining
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

  // Start inline renaming
  const startRename = (slideId, currentName, e) => {
    e.stopPropagation();
    setEditingSlideId(slideId);
    setEditName(currentName);
  };

  // Submit inline renaming
  const submitRename = async (slideId) => {
    if (!editName.trim()) return;
    try {
      const res = await api.put(`/projects/${roomId}/slides/${slideId}`, {
        name: editName.trim(),
      });
      const newSlides = res.data.slides;
      setSlides(newSlides);
      setEditingSlideId("");

      // Broadcast changes
      socketRef.current?.emit("update-slides", { roomId, slides: newSlides });
    } catch (err) {
      console.error("Failed to rename slide", err);
    }
  };

  // Autosave active slide drawing lines back to Mongo
  const saveDrawingToBackend = async (updatedLines) => {
    try {
      await api.post(`/projects/${roomId}/save`, {
        slideId: activeSlideId,
        drawingData: updatedLines,
      });

      // Update local state slides cache array
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

  // Theme variable colors
  const bgClass = isDark ? "bg-[#0b0b0b] text-white" : "bg-[#fcfcfc] text-neutral-900";
  const barBgClass = isDark ? "bg-black border-white/10" : "bg-white border-neutral-200 shadow-sm";
  const textMutedClass = isDark ? "text-white/40" : "text-neutral-500";
  const borderClass = isDark ? "border-white/10" : "border-neutral-200";
  const slideHoverClass = isDark ? "hover:bg-white/5" : "hover:bg-neutral-100";
  const activeSlideClass = isDark ? "bg-white/10 text-white" : "bg-neutral-950 text-white";

  return (
    <div className={`min-h-screen flex flex-col overflow-hidden transition-colors duration-300 ${bgClass}`}>
      
      {/* Header */}
      <header className={`border-b h-16 shrink-0 px-6 flex items-center justify-between transition-colors duration-300 ${barBgClass}`}>
        <div className="flex items-center gap-4">
          <Link to="/" className={`hover:scale-105 transition-transform ${isDark ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-800"}`} title="Back to Dashboard">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 9H3M3 9L8 4M3 9L8 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className={`h-4 w-px ${isDark ? "bg-white/10" : "bg-neutral-200"}`} />
          <div>
            <h1 className="font-bold text-sm tracking-tight">{project.name}</h1>
            <p className={`text-[10px] ${textMutedClass}`}>Room ID: {project.projectId}</p>
          </div>
        </div>

        {/* Member Indicators & Invites */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5 overflow-hidden mr-1">
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
            <button
              onClick={() => setShowInviteModal(true)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full hover:scale-105 active:scale-95 transition-all duration-150 flex items-center gap-1 ${
                isDark ? "bg-white text-black hover:bg-white/90" : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
              }`}
            >
              <span>+ Invite</span>
            </button>
          )}
        </div>
      </header>

      {/* Toolbar strip */}
      <div className={`py-2 px-6 border-b flex justify-center shrink-0 transition-colors duration-300 ${isDark ? "bg-[#080808] border-white/5" : "bg-neutral-50/50 border-neutral-200"}`}>
        <Toolbar
          color={color}
          setColor={setColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          tool={tool}
          setTool={setTool}
          onClear={handleClear}
        />
      </div>

      {/* Workspace Panel: Left Sidebar (Slides List) + Right Content (Canvas) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SLIDES SIDEBAR */}
        <aside className={`w-64 border-r shrink-0 flex flex-col p-4 transition-colors duration-300 ${isDark ? "bg-black border-white/10" : "bg-white border-neutral-200 shadow-sm"}`}>
          <div className="flex items-center justify-between mb-4 px-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Slides</span>
            <button
              onClick={handleAddSlide}
              className={`w-5 h-5 rounded flex items-center justify-center text-xs hover:scale-105 transition-transform ${
                isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
              }`}
              title="Add slide"
            >
              +
            </button>
          </div>

          {/* Slides navigation list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
            {slides.map((slide) => {
              const isActive = slide.slideId === activeSlideId;
              const isEditing = slide.slideId === editingSlideId;
              return (
                <div
                  key={slide.slideId}
                  onClick={() => !isEditing && handleSwitchSlide(slide.slideId)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-left cursor-pointer transition-all duration-150 ${
                    isActive ? activeSlideClass : `text-white/60 ${slideHoverClass}`
                  }`}
                >
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-xs opacity-40 shrink-0">▤</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => submitRename(slide.slideId)}
                        onKeyDown={(e) => e.key === "Enter" && submitRename(slide.slideId)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="bg-neutral-800 text-white border border-neutral-700 rounded px-1.5 py-0.5 text-xs outline-none w-full font-medium"
                      />
                    ) : (
                      <span className={`text-xs font-medium truncate ${
                        isActive ? "text-white" : (isDark ? "text-white/70" : "text-neutral-700")
                      }`}>
                        {slide.name}
                      </span>
                    )}
                  </div>

                  {/* Inline actions (Rename/Delete) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(slide.slideId, slide.name, e)}
                        className={`p-1 rounded hover:bg-white/10 ${isActive ? "text-white" : "text-neutral-400"}`}
                        title="Rename slide"
                      >
                        ✏️
                      </button>
                      {slides.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteSlide(slide.slideId, e)}
                          className="p-1 rounded hover:bg-red-500/20 text-red-500/70 hover:text-red-500"
                          title="Delete slide"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* CANVAS WORKSPACE AREA */}
        <div className="flex-1 bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center">
          <Canvas
            socketRef={socketRef}
            roomId={roomId}
            color={color}
            strokeWidth={strokeWidth}
            tool={tool}
            lines={lines}
            setLines={setLines}
            onDrawEnd={saveDrawingToBackend}
          />
        </div>
      </div>

      {/* Invite Member modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm border rounded-2xl p-6 shadow-2xl relative transition-colors duration-300 ${
            isDark ? "bg-[#0d0d0d] border-white/10 text-white" : "bg-white border-neutral-200 text-neutral-900"
          }`}>
            <button
              onClick={() => { setShowInviteModal(false); setInviteError(""); setInviteSuccess(""); }}
              className={`absolute right-4 top-4 transition-colors ${isDark ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-800"}`}
            >
              ✕
            </button>

            <h3 className="font-bold text-lg mb-1">Invite Collaborator</h3>
            <p className={`text-xs mb-5 ${textMutedClass}`}>Search usernames to add them to this drawing canvas.</p>

            {inviteError && <div className="mb-4 text-xs text-red-400 bg-red-950/20 border border-red-900/50 p-2.5 rounded-xl">{inviteError}</div>}
            {inviteSuccess && <div className="mb-4 text-xs text-green-400 bg-green-950/20 border border-green-900/50 p-2.5 rounded-xl">{inviteSuccess}</div>}

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Search username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-white/30 ${
                  isDark ? "bg-white/5 border-white/10 text-white" : "bg-neutral-50 border-neutral-200 text-neutral-900"
                }`}
              />

              {searchResults.length > 0 && (
                <div className={`border rounded-xl max-h-40 overflow-y-auto divide-y ${
                  isDark ? "border-white/10 bg-white/[0.02] divide-white/5" : "border-neutral-200 bg-neutral-50 divide-neutral-200"
                }`}>
                  {searchResults.map((u) => (
                    <div key={u._id} className="p-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{u.username}</span>
                      <button
                        onClick={() => handleInvite(u.username)}
                        disabled={inviteLoading}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md hover:opacity-90 ${
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
                <p className="text-center text-xs text-white/30 py-2">No matching users found</p>
              )}

              <div className={`mt-4 pt-4 border-t ${isDark ? "border-white/10" : "border-neutral-200"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2.5 ${textMutedClass}`}>Current members</p>
                <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                  {project.members.map((m) => (
                    <div key={m._id} className="flex items-center gap-2 text-xs">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                        isDark ? "bg-white/10 text-white/60" : "bg-neutral-200 text-neutral-700"
                      }`}>
                        {m.username?.[0]?.toUpperCase()}
                      </div>
                      <span>{m.username}</span>
                      {m._id === project.creator?._id && <span className={`text-[8px] border px-1.5 py-0.25 rounded-md ml-auto ${
                        isDark ? "border-white/10 bg-white/5 text-white/30" : "border-neutral-200 bg-neutral-50 text-neutral-400"
                      }`}>Creator</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
