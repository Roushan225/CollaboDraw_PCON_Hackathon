import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import Canvas from "../components/Canvas";
import useSocket from "../hooks/useSocket";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

// Render vector previews of tldraw store shapes in a square card
function SlidePreviewCard({ slide, isActive, onClick, onDelete, theme }) {
  const isDark = theme === "dark";
  const { name, drawingData } = slide;

  const cardBorder = isActive
    ? (isDark ? "border-white ring-2 ring-white/10" : "border-neutral-900 ring-2 ring-black/5")
    : (isDark ? "border-white/10 hover:border-white/30" : "border-neutral-200 hover:border-neutral-400 bg-white");
  
  const textBg = isDark ? "bg-black/60 text-white/70" : "bg-neutral-100/80 text-neutral-800";
  const canvasBg = isDark ? "bg-[#141416]" : "bg-neutral-50";

  // Extract shapes from tldraw store snapshot
  const shapes = drawingData?.store
    ? Object.values(drawingData.store).filter((r) => r.typeName === "shape")
    : [];

  return (
    <div
      onClick={onClick}
      className={`w-[72px] h-[72px] rounded-xl border flex flex-col relative overflow-hidden transition-all duration-200 cursor-pointer select-none shrink-0 group ${cardBorder} ${canvasBg}`}
    >
      {/* Tldraw SVG preview wrapper */}
      <svg viewBox="0 0 1200 800" className="w-full h-[52px] pointer-events-none p-1.5 opacity-80">
        {shapes.map((shape, idx) => {
          const color = isDark ? "#ffffff" : "#171717";
          const strokeWidth = 8;
          const { x, y } = shape;
          const props = shape.props || {};

          if (shape.type === "draw") {
            // Draw segments
            let d = "";
            props.segments?.forEach((seg) => {
              if (seg.points?.length > 0) {
                seg.points.forEach((pt, i) => {
                  const px = x + pt.x;
                  const py = y + pt.y;
                  d += (i === 0 ? "M " : "L ") + `${px} ${py} `;
                });
              }
            });
            return (
              <path
                key={idx}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          } else if (shape.type === "geo") {
            if (props.geo === "rectangle") {
              return (
                <rect
                  key={idx}
                  x={x}
                  y={y}
                  width={props.w}
                  height={props.h}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  rx={8}
                />
              );
            } else if (props.geo === "ellipse") {
              return (
                <ellipse
                  key={idx}
                  cx={x + props.w / 2}
                  cy={y + props.h / 2}
                  rx={props.w / 2}
                  ry={props.h / 2}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                />
              );
            }
          } else if (shape.type === "arrow" || shape.type === "line") {
            // Simple line connection representation
            return (
              <line
                key={idx}
                x1={x}
                y1={y}
                x2={x + (props.w || 100)}
                y2={y + (props.h || 100)}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          } else if (shape.type === "text" || shape.type === "note") {
            return (
              <text
                key={idx}
                x={x}
                y={y + 50}
                fill={color}
                fontSize={70}
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

      {/* Tiny card label */}
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
  
  // Theme check from local storage
  const [theme] = useState(() => localStorage.getItem("theme") || "dark");
  const isDark = theme === "dark";

  // Project details
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectError, setProjectError] = useState("");
  const [memberRoles, setMemberRoles] = useState({});
  const [activeRolePopup, setActiveRolePopup] = useState(null);

  // Slides details
  const [slides, setSlides] = useState([]);
  const [activeSlideId, setActiveSlideId] = useState("");
  const activeSlideIdRef = useRef(""); // Always up-to-date ref for use inside stale closures

  // Drawing state (Now represented as Tldraw store snapshots)
  const [lines, setLines] = useState(null);

  // Invite state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Search params from URL to handle opening specific slide directly
  const [searchParams] = useSearchParams();
  const querySlideId = searchParams.get("slide");

  // Real-time Collaborators Presence state
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Real-time Chat States
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatTarget, setChatTarget] = useState("team"); // "team" or specific userId
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [pulseButton, setPulseButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChatPanel]);

  // Trigger pop animation and manage unread count on chat icon when a new message arrives
  useEffect(() => {
    if (showChatPanel) {
      setUnreadCount(0);
    } else if (messages.length > prevMessagesLengthRef.current) {
      const diff = messages.length - prevMessagesLengthRef.current;
      setUnreadCount((prev) => prev + diff);
      setPulseButton(true);
      const timer = setTimeout(() => setPulseButton(false), 600);
      return () => clearTimeout(timer);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, showChatPanel]);

  // Fetch project details and slides on load
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const res = await api.get(`/projects/${roomId}`);
        const proj = res.data.project;
        setProject(proj);
        setSlides(proj.slides || []);
        setMessages(proj.messages || []);
        setMemberRoles(proj.memberRoles || {});
        
        if (proj.slides && proj.slides.length > 0) {
          // Check if custom slide query param is passed and valid
          const targetSlide = proj.slides.find(s => s.slideId === querySlideId);
          if (targetSlide) {
            activeSlideIdRef.current = targetSlide.slideId;
            setActiveSlideId(targetSlide.slideId);
            setLines(targetSlide.drawingData || null);
          } else {
            activeSlideIdRef.current = proj.slides[0].slideId;
            setActiveSlideId(proj.slides[0].slideId);
            setLines(proj.slides[0].drawingData || null);
          }
        }
      } catch (err) {
        setProjectError(err?.response?.data?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetails();
  }, [roomId, querySlideId]);

  // Re-fetch project details so member list updates dynamically when a new collaborator joins
  const fetchProjectMembers = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${roomId}`);
      const proj = res.data.project;
      setProject(proj);
      setMemberRoles(proj.memberRoles || {});
    } catch (err) {
      // ignore
    }
  }, [roomId]);

  // Format relative active time on hover
  const formatLastActive = useCallback((member) => {
    const isOnline = onlineUsers.some((u) => u.userId === member._id);
    if (isOnline) return "Active Now";
    if (!member.lastActive) return "Offline";

    const diffMs = new Date() - new Date(member.lastActive);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Active just now";
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    return `Active ${diffDays}d ago`;
  }, [onlineUsers]);

  // Primitives for dependency array to prevent infinite loop re-renders
  const userId = user?._id || user?.id;
  const username = user?.username || "Anonymous";

  // Handle Socket.io connections & synchronization events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return; // 'project' removed from deps to prevent fetch loop

    // Join room broadcasting our user ID and username
    const joinPayload = {
      roomId,
      userId,
      username
    };
    socket.emit("join-room", joinPayload);

    socket.on("connect", () => {
      socket.emit("join-room", joinPayload);
    });

    // Listen for live presence updates
    socket.on("presence-update", (users) => {
      setOnlineUsers(users);
      fetchProjectMembers();
    });

     // Listen for real-time team chat messages (with de-duplication)
     socket.on("chat-message", (msg) => {
       setMessages((prev) => {
         if (prev.some((m) => m.id === msg.id)) return prev;
         return [...prev, msg];
       });
     });
 
     // Listen for real-time individual private messages (with de-duplication)
     socket.on("private-message", (msg) => {
       setMessages((prev) => {
         if (prev.some((m) => m.id === msg.id)) return prev;
         return [...prev, msg];
       });
     });

    // Sync slide list when modified by another user
    socket.on("update-slides", (updatedSlides) => {
      setSlides(updatedSlides);
      
      const currentActiveSlideId = activeSlideIdRef.current;
      const stillExists = updatedSlides.some(s => s.slideId === currentActiveSlideId);
      if (!stillExists && updatedSlides.length > 0) {
        const fallback = updatedSlides[0];
        setActiveSlideId(fallback.slideId);
        activeSlideIdRef.current = fallback.slideId;
        setLines(fallback.drawingData || null);
      } else {
        const activeObj = updatedSlides.find(s => s.slideId === currentActiveSlideId);
        if (activeObj) setLines(activeObj.drawingData || null);
      }
    });

    // Remote user switched slide
    socket.on("switch-slide", ({ slideId }) => {
      setActiveSlideId(slideId);
      activeSlideIdRef.current = slideId;
      setSlides(currSlides => {
        const slideObj = currSlides.find(s => s.slideId === slideId);
        if (slideObj) setLines(slideObj.drawingData || null);
        return currSlides;
      });
    });

    // Remote user synced drawing canvas snapshot
    socket.on("sync-canvas", ({ slideId: incomingSlideId, canvasData }) => {
      if (incomingSlideId === activeSlideIdRef.current) {
        setLines(canvasData);
      }
      setSlides(prev => prev.map(s => {
        if (s.slideId === incomingSlideId) {
          return { ...s, drawingData: canvasData };
        }
        return s;
      }));
    });

    // Remote user's role changed (editor/viewer)
    socket.on("role-change", ({ targetUserId, role }) => {
      setMemberRoles((prev) => ({ ...prev, [targetUserId]: role }));
    });

    return () => {
      socket.off("connect");
      socket.off("presence-update");
      socket.off("chat-message");
      socket.off("private-message");
      socket.off("update-slides");
      socket.off("switch-slide");
      socket.off("sync-canvas");
      socket.off("role-change");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, socketRef, userId, username]);

  // Switch slide helper
  const handleSwitchSlide = (slideId) => {
    activeSlideIdRef.current = slideId;
    setActiveSlideId(slideId);
    const targetSlide = slides.find(s => s.slideId === slideId);
    setLines(targetSlide ? targetSlide.drawingData || null : null);

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
      activeSlideIdRef.current = res.data.slideId;
      setLines(null);

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
        activeSlideIdRef.current = fallbackId;
        const fallbackSlide = newSlides.find(s => s.slideId === fallbackId);
        setLines(fallbackSlide ? fallbackSlide.drawingData || null : null);
      }

      // Broadcast changes
      socketRef.current?.emit("update-slides", { roomId, slides: newSlides });
    } catch (err) {
      console.error("Failed to delete slide", err);
    }
  };

  // Autosave active slide drawing snapshot back to Mongo
  // Uses activeSlideIdRef to avoid stale closure capturing wrong slideId
  const saveDrawingToBackend = useCallback(async (updatedSnapshot, sourceSlideId) => {
    const currentSlideId = sourceSlideId || activeSlideIdRef.current;
    if (!currentSlideId) return;
    try {
      await api.post(`/projects/${roomId}/save`, {
        slideId: currentSlideId,
        drawingData: updatedSnapshot,
      });

      // ONLY update the slide card preview — do NOT call setLines() here.
      // Calling setLines would re-trigger Canvas useEffect → loadSnapshot → store change → save loop.
      setSlides(prev => prev.map(s => {
        if (s.slideId === currentSlideId) {
          return { ...s, drawingData: updatedSnapshot };
        }
        return s;
      }));
    } catch (err) {
      console.error("Autosave slide error", err);
    }
  }, [roomId]);

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

  // Change member role
  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await api.put(`/projects/${roomId}/role`, { targetUserId, role: newRole });
      setMemberRoles((prev) => ({ ...prev, [targetUserId]: newRole }));
      socketRef.current?.emit("role-change", { roomId, targetUserId, role: newRole });
    } catch (err) {
      console.error("Failed to update role", err);
    }
  };

  // Send message over WebSocket (Team or Private)
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const socket = socketRef.current;
    if (!socket) return;

    const msgId = Math.random().toString(36).substring(2, 9);
    const payload = {
      id: msgId,
      roomId,
      text: chatInput,
      senderId: user?._id || user?.id,
      senderName: user?.username || "Anonymous",
      timestamp: new Date().toISOString(),
      type: chatTarget === "team" ? "team" : "private",
      receiverId: chatTarget === "team" ? undefined : chatTarget
    };

    // Optimistic UI Update: append message immediately so UI is instant
    setMessages((prev) => [...prev, payload]);

    if (chatTarget === "team") {
      socket.emit("send-chat-message", payload);
    } else {
      socket.emit("send-private-message", payload);
    }

    setChatInput("");
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

  const loggedInUserId = user?._id || user?.id;
  const creatorId = project?.creator?._id || project?.creator;
  const isCreator = loggedInUserId && creatorId && (creatorId.toString() === loggedInUserId.toString());
  const isReadonly = !isCreator && memberRoles[loggedInUserId] === "viewer";

  // Theme variables colors
  const bgClass = isDark ? "bg-[#0b0b0d] text-white" : "bg-[#f5f5f7] text-neutral-900";
  const barBgClass = isDark ? "bg-black/90 border-white/10" : "bg-white border-neutral-200 shadow-sm";
  const textMutedClass = isDark ? "text-white/40" : "text-neutral-500";
  const headerSurfaceClass = isDark
    ? "bg-white/[0.035] border-white/10"
    : "bg-neutral-50 border-neutral-200";
  const headerButtonClass = isDark
    ? "bg-white/[0.035] border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
    : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950 shadow-sm";
  const rolePillClass = isReadonly
    ? isDark ? "bg-white/5 text-white/55 border-white/10" : "bg-neutral-100 text-neutral-600 border-neutral-200"
    : isDark ? "bg-white text-black border-white" : "bg-neutral-950 text-white border-neutral-950";

  // Custom keyframes for premium UI animations
  const chatStyles = `
    @keyframes chatPop {
      0% { transform: scale(1); }
      30% { transform: scale(1.15) rotate(-8deg); }
      50% { transform: scale(0.92) rotate(6deg); }
      75% { transform: scale(1.06) rotate(-3deg); }
      100% { transform: scale(1); }
    }
    @keyframes badgePop {
      0% { transform: scale(0); opacity: 0; }
      80% { transform: scale(1.3); }
      100% { transform: scale(1); opacity: 1; }
    }
    .animate-chat-pop {
      animation: chatPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .animate-badge-pop {
      animation: badgePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
  `;

  return (
    <div className={`min-h-screen flex flex-col overflow-hidden transition-colors duration-300 ${bgClass}`}>
      <style dangerouslySetInnerHTML={{ __html: chatStyles }} />
      
      {/* Header Bar */}
      <header className={`border-b h-24 shrink-0 px-4 sm:px-6 lg:px-8 flex items-center gap-4 transition-colors duration-300 relative z-20 ${barBgClass}`}>
        
        {/* Left Side: Back action & Project Details */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link to="/" className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center transition-all duration-150 hover:-translate-x-0.5 ${headerButtonClass}`} title="Back to Dashboard">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 9H3M3 9L8 4M3 9L8 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          
          <div className={`min-w-0 max-w-[300px] rounded-2xl border px-4 py-2.5 ${headerSurfaceClass}`}>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate text-sm font-extrabold tracking-tight">{project.name}</h1>
              <span className={`hidden sm:inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${rolePillClass}`}>
                {isReadonly ? "Viewer" : "Editor"}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className={`truncate text-[10px] font-medium ${textMutedClass}`}>ID {project.projectId}</span>
              <span className={`hidden sm:inline-block h-1 w-1 shrink-0 rounded-full ${isDark ? "bg-white/20" : "bg-neutral-300"}`} />
              <span className={`hidden sm:inline text-[10px] font-medium ${textMutedClass}`}>{project.members?.length || 0} members</span>
            </div>
          </div>

          {/* Members & Invites */}
          <div className={`hidden lg:flex items-center gap-3 rounded-2xl border px-3 py-2 ${headerSurfaceClass}`}>
            <div className="flex -space-x-1.5 overflow-visible">
              {project.members?.map((member, idx) => {
                const isOnline = onlineUsers.some((u) => u.userId === member._id);
                const lastActiveStr = formatLastActive(member);
                return (
                  <div key={member._id || idx} className="relative group shrink-0">
                    <div
                      onClick={() => setActiveRolePopup(prev => prev === member._id ? null : member._id)}
                      className={`w-8 h-8 rounded-full border-[2.5px] flex items-center justify-center text-[10px] font-bold shadow-sm transition-all duration-300 hover:-translate-y-1 hover:z-10 relative cursor-pointer ${
                        isOnline
                          ? (isDark ? "bg-neutral-800 border-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-neutral-100 border-green-500 text-neutral-800")
                          : (isDark ? "bg-neutral-800 border-black text-white/50" : "bg-neutral-100 border-white text-neutral-500")
                      }`}
                    >
                      {member.username?.[0]?.toUpperCase()}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-black rounded-full" />
                      )}
                    </div>

                    {/* Premium Hover Tooltip (Small) */}
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-y-1 transition-all duration-200 z-50 flex flex-col items-center`}>
                      <div className={`px-3 py-1.5 rounded-lg whitespace-nowrap border shadow-xl flex flex-col items-center gap-0.5 ${
                        isDark ? "bg-[#1c1c1f] border-white/10 text-white" : "bg-white border-neutral-200 text-black"
                      }`}>
                        <span className="text-xs font-bold">{member.username}</span>
                        <span className={`text-[9px] font-medium ${isDark ? "text-white/50" : "text-neutral-500"}`}>
                          {isOnline ? "Online Now" : `Last seen ${lastActiveStr}`}
                        </span>
                      </div>
                    </div>

                    {/* Dedicated Role Popup on Click */}
                    {activeRolePopup === member._id && (
                      <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[60] flex flex-col items-center animate-in fade-in zoom-in duration-200`}>
                        <div className={`p-3 rounded-xl min-w-[140px] border shadow-2xl flex flex-col items-center gap-2 ${
                          isDark ? "bg-[#1c1c1f]/95 backdrop-blur-xl border-white/10 text-white" : "bg-white/95 backdrop-blur-xl border-neutral-200 text-black"
                        }`}>
                          <div className="flex items-center justify-between w-full pb-2 border-b border-inherit/10">
                            <span className="text-xs font-extrabold truncate">{member.username}</span>
                            <button onClick={(e) => { e.stopPropagation(); setActiveRolePopup(null); }} className="text-[10px] opacity-50 hover:opacity-100">✕</button>
                          </div>
                          
                          {/* Role Status / Toggle */}
                          {isCreator && member._id !== project.creator._id ? (
                            <div className="flex w-full gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRoleChange(member._id, "editor"); }}
                                className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg transition-colors ${
                                  memberRoles[member._id] !== "viewer"
                                    ? (isDark ? "bg-white text-black" : "bg-neutral-950 text-white")
                                    : isDark ? "bg-white/5 text-white/50 hover:bg-white/10" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                                }`}
                              >
                                Editor
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRoleChange(member._id, "viewer"); }}
                                className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg transition-colors ${
                                  memberRoles[member._id] === "viewer"
                                    ? (isDark ? "bg-white text-black" : "bg-neutral-950 text-white")
                                    : isDark ? "bg-white/5 text-white/50 hover:bg-white/10" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                                }`}
                              >
                                Viewer
                              </button>
                            </div>
                          ) : (
                            <div className={`w-full text-center text-[10px] font-bold py-1 rounded-lg ${
                              memberRoles[member._id] === "viewer" 
                                ? isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
                                : isDark ? "bg-white/5 text-white" : "bg-neutral-100 text-neutral-700"
                            }`}>
                              {member._id === project.creator._id ? "Creator" : memberRoles[member._id] === "viewer" ? "Viewer" : "Editor"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active online collaborators count presence badge */}
            {onlineUsers.length > 0 && (
              <div 
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1.5 ${
                  isDark ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-green-50 text-green-600 border border-green-100 shadow-sm"
                }`}
                title={`${onlineUsers.map(u => u.username).join(", ")} online`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>{onlineUsers.length} Online</span>
              </div>
            )}

            {isCreator && (
              <div className="relative">
                <button
                  onClick={() => setShowInviteModal(!showInviteModal)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl active:scale-95 transition-all duration-150 flex items-center gap-1 ${
                    isDark ? "bg-white text-black hover:bg-white/90" : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
                  }`}
                >
                  <span>Invite</span>
                </button>

                {showInviteModal && (
                  <div className={`absolute left-0 top-11 w-80 border rounded-2xl p-5 shadow-2xl z-30 transition-colors duration-300 ${
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
                      
                      {/* Copy Shareable Invite Link Button */}
                      <button
                        onClick={() => {
                          const inviteLink = `https://collabo-draw-pcon-hackathon.vercel.app/signup?invite=${roomId}`;
                          navigator.clipboard.writeText(inviteLink);
                          setInviteSuccess("Invite link copied to clipboard!");
                        }}
                        className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all duration-100 flex items-center justify-center gap-1.5 active:scale-95 ${
                          isDark
                            ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                            : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        🔗 Copy Invite Link
                      </button>

                      <div className={`h-px my-1 ${isDark ? "bg-white/5" : "bg-neutral-200/60"}`} />
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

        {/* Right Side: Square Slide cards row */}
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <div className={`hidden xl:flex flex-col items-end leading-none ${textMutedClass}`}>
            <span className="text-[9px] font-black uppercase tracking-[0.16em]">Slides</span>
            <span className="mt-1 text-[10px] font-bold">{slides.length} total</span>
          </div>
          {/* Horizontal Slide Cards Row */}
          <div className={`flex max-w-[min(44vw,560px)] items-center gap-2 overflow-x-auto rounded-2xl border p-2 ${headerSurfaceClass}`}>
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
              className={`flex items-center justify-center w-[72px] h-[72px] shrink-0 rounded-xl border text-xl font-bold transition-all duration-150 ${
                isDark
                  ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  : "bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-sm"
              }`}
              title="Add New Slide"
            >
              +
            </button>
          </div>
        </div>
      </header>

      {/* Floating Canvas Area (Tldraw manages toolbar internally) */}
      <main className={`flex-1 relative overflow-hidden flex items-center justify-start transition-colors duration-300 ${
        isDark ? "bg-[#0c0c0e]" : "bg-[#f5f5f7]"
      }`}>
        <Canvas
          key={activeSlideId}
          socketRef={socketRef}
          roomId={roomId}
          slideId={activeSlideId}
          lines={lines}
          setLines={setLines}
          onDrawEnd={saveDrawingToBackend}
          theme={theme}
          isChatOpen={showChatPanel}
          isInviteOpen={false}
          currentUser={user}
          isReadonly={isReadonly}
        />

        {/* 1. FLOATING CHAT PANEL TOGGLE BUTTON */}
        <button
          onClick={() => setShowChatPanel(!showChatPanel)}
          style={{ right: showChatPanel ? "344px" : "24px" }}
          className={`fixed bottom-6 z-[101] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
            isDark ? "bg-[#007aff] text-white hover:bg-[#007aff]/90" : "bg-neutral-900 text-white hover:bg-neutral-800"
          } ${pulseButton ? "animate-chat-pop" : ""}`}
          title="Open Collaboration Chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && !showChatPanel && (
            <span className={`absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[8px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center ring-2 animate-badge-pop ${
              isDark ? "ring-[#0c0c0e]" : "ring-white"
            }`}>
              {unreadCount}
            </span>
          )}
        </button>

        {/* 2. COLLAPSIBLE REAL-TIME CHAT SIDEBAR DRAWER */}
        {showChatPanel && (
          <div
            className={`fixed right-0 top-24 bottom-0 w-80 border-l shadow-2xl z-[100] flex flex-col backdrop-blur-md transition-all duration-300 ${
              isDark ? "bg-[#0c0c0e]/95 border-white/10 text-white" : "bg-white/95 border-neutral-200 text-neutral-900"
            }`}
          >
            {/* Header: Select Chat Target Channel */}
            <div className={`p-4 border-b flex flex-col gap-2 ${isDark ? "border-white/10" : "border-neutral-200"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs tracking-tight">Collaboration Chat</h3>
                <button
                  onClick={() => setShowChatPanel(false)}
                  className={`text-xs hover:scale-105 transition-transform ${isDark ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-700"}`}
                >
                  ✕
                </button>
              </div>

              {/* Channel Selector Choice */}
              <select
                value={chatTarget}
                onChange={(e) => setChatTarget(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white focus:border-white/30"
                    : "bg-neutral-50 border-neutral-200 text-neutral-800 focus:border-neutral-300 shadow-sm"
                }`}
              >
                <option value="team" className={isDark ? "bg-neutral-950 text-white" : "bg-white text-neutral-800"}>📢 Team Chat (Everyone)</option>
                {project.members
                  ?.filter(m => m._id !== (user?._id || user?.id))
                  .map(m => {
                    const isOnline = onlineUsers.some(u => u.userId === m._id);
                    return (
                      <option
                        key={m._id}
                        value={m._id}
                        className={isDark ? "bg-neutral-950 text-white" : "bg-white text-neutral-800"}
                      >
                        🔒 Private: {m.username} {isOnline ? "(🟢 Online)" : "(⚪ Offline)"}
                      </option>
                    );
                  })
                }
              </select>
            </div>

            {/* Body: Messages List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.filter(msg => {
                if (chatTarget === "team") {
                  return msg.type === "team";
                } else {
                  // Filter private messages between logged-in user and selected collaborator
                  const myId = user?._id || user?.id;
                  return msg.type === "private" && (
                    (msg.senderId === myId && msg.receiverId === chatTarget) ||
                    (msg.senderId === chatTarget && msg.receiverId === myId)
                  );
                }
              }).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-30">
                  <span className="text-2xl mb-1">💬</span>
                  <p className="text-[10px]">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.filter(msg => {
                  if (chatTarget === "team") {
                    return msg.type === "team";
                  } else {
                    const myId = user?._id || user?.id;
                    return msg.type === "private" && (
                      (msg.senderId === myId && msg.receiverId === chatTarget) ||
                      (msg.senderId === chatTarget && msg.receiverId === myId)
                    );
                  }
                }).map((msg) => {
                  const isMe = msg.senderId === (user?._id || user?.id);
                  const msgTime = msg.timestamp 
                    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={msg.id} className={`flex items-start gap-2.5 max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}>
                      {/* Avatar for other users */}
                      {!isMe && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 border uppercase ${
                          isDark 
                            ? "bg-white/10 border-white/10 text-white/80" 
                            : "bg-neutral-100 border-neutral-200 text-neutral-600 shadow-sm"
                        }`}>
                          {msg.senderName?.[0] || "A"}
                        </div>
                      )}
                      
                      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[8px] font-extrabold opacity-40`}>
                            {isMe ? "You" : msg.senderName}
                          </span>
                          <span className="text-[7px] opacity-25 font-medium">{msgTime}</span>
                        </div>
                        
                        <div className={`px-3 py-2 rounded-2xl text-[11px] leading-relaxed break-words shadow-sm transition-all duration-150 ${
                          isMe
                            ? (isDark ? "bg-[#007aff] text-white rounded-tr-none" : "bg-neutral-900 text-white rounded-tr-none")
                            : (isDark ? "bg-white/5 text-white/95 rounded-tl-none border border-white/5" : "bg-neutral-100/90 text-neutral-800 rounded-tl-none border border-neutral-200/50")
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Dummy element for scroll anchoring */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input message form */}
            <form onSubmit={handleSendMessage} className={`p-4 border-t flex gap-2 ${isDark ? "border-white/10" : "border-neutral-200"}`}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={chatTarget === "team" ? "Message team..." : "Private message..."}
                className={`flex-1 border rounded-xl px-3 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white focus:border-white/30"
                    : "bg-neutral-50 border-neutral-200 text-neutral-900 focus:border-neutral-300"
                }`}
              />
              <button
                type="submit"
                className={`px-3.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${
                  isDark ? "bg-white text-black hover:bg-white/90" : "bg-neutral-950 text-white hover:bg-neutral-800"
                }`}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
