import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Canvas from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import useSocket from "../hooks/useSocket";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function DrawingRoom() {
  const { roomId } = useParams(); // roomId matches projectId in DB
  const socketRef = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Project details loaded from backend
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectError, setProjectError] = useState("");

  // Canvas drawing state
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [tool, setTool] = useState("pen");
  const [lines, setLines] = useState([]); // Shared lines array

  // User search/invite state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch project detail on mount
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const res = await api.get(`/projects/${roomId}`);
        setProject(res.data.project);
        setLines(res.data.project.drawingData || []);
      } catch (err) {
        setProjectError(err?.response?.data?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetails();
  }, [roomId]);

  // Join the socket room once loaded
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !project) return;

    socket.emit("join-room", roomId);

    socket.on("connect", () => {
      socket.emit("join-room", roomId);
    });

    return () => {
      socket.off("connect");
    };
  }, [roomId, socketRef, project]);

  // Handle searching users
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
        console.error("Search failed", err);
      }
    }, 300); // debounced search

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Invite user to project
  const handleInvite = async (targetUsername) => {
    setInviteError("");
    setInviteSuccess("");
    setInviteLoading(true);
    try {
      const res = await api.post(`/projects/${roomId}/invite`, { username: targetUsername });
      setProject(res.data.project); // Refresh members list
      setInviteSuccess(res.data.message);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      setInviteError(err?.response?.data?.message || "Invitation failed");
    } finally {
      setInviteLoading(false);
    }
  };

  // Autosave drawing data to MongoDB
  const saveDrawingToBackend = async (updatedLines) => {
    try {
      await api.post(`/projects/${roomId}/save`, { drawingData: updatedLines });
    } catch (err) {
      console.error("Drawing autosave failed", err);
    }
  };

  // Clear canvas
  const handleClear = () => {
    setLines([]);
    socketRef.current?.emit("clear-canvas", roomId);
    saveDrawingToBackend([]);
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
      
      {/* Navbar Header */}
      <header className="border-b border-white/10 h-16 shrink-0 bg-black/80 backdrop-blur px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white/40 hover:text-white transition-colors" title="Back to Dashboard">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 9H3M3 9L8 4M3 9L8 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white/90">{project.name}</h1>
            <p className="text-[10px] text-white/35">Project ID: {project.projectId}</p>
          </div>
        </div>

        {/* Member indicator & invite action */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5 overflow-hidden mr-1">
            {project.members?.map((member, idx) => (
              <div
                key={member._id || idx}
                title={member.username}
                className="w-7 h-7 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[9px] font-bold text-white/80 shrink-0"
              >
                {member.username?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>

          {isCreator && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-xs bg-white text-black font-semibold px-3 py-1.5 rounded-full hover:bg-white/90 active:scale-95 transition-all duration-150 flex items-center gap-1"
            >
              <span>+ Invite</span>
            </button>
          )}
        </div>
      </header>

      {/* Toolbar Container */}
      <div className="py-2.5 px-6 border-b border-white/5 bg-[#080808] flex justify-center shrink-0">
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

      {/* Drawing Board / Canvas area */}
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

      {/* Invite Member modal popup */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-white/10 rounded-2xl bg-[#0d0d0d] p-6 shadow-2xl relative">
            <button
              onClick={() => { setShowInviteModal(false); setInviteError(""); setInviteSuccess(""); }}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              ✕
            </button>

            <h3 className="font-bold text-lg mb-1 text-white">Invite Collaborator</h3>
            <p className="text-white/40 text-xs mb-5">Search usernames to add them to this drawing canvas.</p>

            {inviteError && <div className="mb-4 text-xs text-red-400 bg-red-950/20 border border-red-900/50 p-2.5 rounded-xl">{inviteError}</div>}
            {inviteSuccess && <div className="mb-4 text-xs text-green-400 bg-green-950/20 border border-green-900/50 p-2.5 rounded-xl">{inviteSuccess}</div>}

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Search username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/30"
              />

              {/* Search Result List */}
              {searchResults.length > 0 && (
                <div className="border border-white/10 rounded-xl bg-white/[0.02] max-h-40 overflow-y-auto divide-y divide-white/5">
                  {searchResults.map((u) => (
                    <div key={u._id} className="p-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white/80">{u.username}</span>
                      <button
                        onClick={() => handleInvite(u.username)}
                        disabled={inviteLoading}
                        className="text-[10px] bg-white text-black font-bold px-2.5 py-1 rounded-md hover:bg-white/85"
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

              {/* Current Members List inside Modal */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/45 font-medium uppercase tracking-wider mb-2.5">Current members</p>
                <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                  {project.members.map((m) => (
                    <div key={m._id} className="flex items-center gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/60">
                        {m.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-white/60">{m.username}</span>
                      {m._id === project.creator?._id && <span className="text-[8px] text-white/30 bg-white/5 border border-white/10 px-1.5 py-0.25 rounded-md ml-auto">Creator</span>}
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
