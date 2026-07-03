import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Theme state: dark (default) or light (premium white)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Load user's projects
  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data.projects);
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateLoading(true);
    setError("");
    try {
      const res = await api.post("/projects", { name });
      navigate(`/room/${res.data.project.projectId}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create project");
      setCreateLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  // Theme-conditional classes
  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-black text-white" : "bg-[#fcfcfc] text-neutral-900";
  const navBgClass = isDark ? "border-white/10 bg-black/80" : "border-neutral-200 bg-white/80";
  const borderClass = isDark ? "border-white/10" : "border-neutral-200";
  const cardBgClass = isDark ? "bg-white/[0.02]" : "bg-white shadow-sm border border-neutral-100";
  const textMutedClass = isDark ? "text-white/40" : "text-neutral-500";
  const inputBgClass = isDark ? "bg-white/5 text-white" : "bg-neutral-50 text-neutral-950";
  const listHoverClass = isDark ? "hover:bg-white/[0.02]" : "hover:bg-neutral-50";

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-300 ${bgClass}`}>
      
      {/* Navbar */}
      <nav className={`border-b sticky top-0 z-40 backdrop-blur-xl transition-colors duration-300 ${navBgClass}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-300 ${isDark ? "bg-white text-black" : "bg-neutral-950 text-white"}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L6 6L10 10L14 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-[16px] tracking-tight">CollaboDraw</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all duration-300 hover:scale-105 ${borderClass} ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-white hover:bg-neutral-50 shadow-sm"}`}
              title={isDark ? "Switch to Premium White" : "Switch to Dark Mode"}
            >
              {isDark ? (
                /* Sun Icon */
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="3" />
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M1 15l14-14" strokeLinecap="round"/>
                </svg>
              ) : (
                /* Moon Icon */
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 10.5a5 5 0 1 1-5-8.5A5.5 5.5 0 1 0 12 10.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>

            {/* Profile Info */}
            <div className={`flex items-center gap-2.5 border rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${borderClass} ${isDark ? "bg-white/5 text-white/70" : "bg-white text-neutral-700 shadow-sm"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-800"}`}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span>{user?.username}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="text-xs text-red-500/70 hover:text-red-500 font-medium transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
        
        {/* Top Control Bar — Header + Quick Create Inline */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8 ${borderClass}`}>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Project Board</h1>
            <p className={`text-sm mt-1.5 ${textMutedClass}`}>Create and access your real-time collaborative sketchrooms.</p>
          </div>

          {/* Quick Create Project Form */}
          <form onSubmit={handleCreate} className="flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${borderClass} ${isDark ? "bg-white/5" : "bg-white shadow-sm"} w-64`}>
              <span className={textMutedClass}>✏️</span>
              <input
                type="text"
                placeholder="New project name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-transparent text-sm placeholder-neutral-400 outline-none w-full"
              />
            </div>
            <button
              type="submit"
              disabled={createLoading || !name.trim()}
              className={`text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all duration-150 whitespace-nowrap ${
                isDark ? "bg-white text-black hover:bg-white/90" : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-md"
              }`}
            >
              {createLoading ? "Creating..." : "Create"}
            </button>
          </form>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* PAGE UI: List/Directory layout */}
        <div className="flex-1 flex flex-col">
          {loading ? (
            /* Table skeleton loader */
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 5].map((i) => (
                <div key={i} className={`h-16 rounded-xl border animate-pulse ${borderClass} ${isDark ? "bg-white/[0.01]" : "bg-white"}`} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            /* Empty state */
            <div className={`text-center py-24 border border-dashed rounded-3xl ${borderClass} ${isDark ? "bg-white/[0.005]" : "bg-neutral-50/50"}`}>
              <span className="text-4xl block mb-4">📂</span>
              <h3 className="font-bold text-lg mb-1">No sketchrooms found</h3>
              <p className={`text-xs ${textMutedClass} max-w-xs mx-auto mb-6`}>
                You haven&apos;t created any projects yet. Enter a name in the box above to start.
              </p>
            </div>
          ) : (
            /* PAGE UI: Directory/Table List */
            <div className={`border rounded-2xl overflow-hidden ${borderClass} ${isDark ? "bg-black" : "bg-white shadow-sm"}`}>
              {/* Header row */}
              <div className={`hidden md:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold uppercase tracking-wider border-b ${borderClass} ${isDark ? "bg-white/[0.015] text-white/40" : "bg-neutral-50 text-neutral-500"}`}>
                <div className="col-span-5">Project Name</div>
                <div className="col-span-2">Project ID</div>
                <div className="col-span-2">Owner</div>
                <div className="col-span-2">Collaborators</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/5">
                {projects.map((project) => {
                  const isCreator = project.creator?._id === user?.id || project.creator === user?.id;
                  const cardBorder = isDark ? "border-white/5" : "border-neutral-100";
                  return (
                    <div
                      key={project.projectId}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-5 transition-colors duration-150 ${listHoverClass} border-b ${cardBorder}`}
                    >
                      {/* Name */}
                      <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isDark ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-800"
                        }`}>
                          📄
                        </div>
                        <div className="truncate">
                          <Link
                            to={`/room/${project.projectId}`}
                            className="font-bold text-base hover:underline leading-snug"
                          >
                            {project.name}
                          </Link>
                          <span className={`block text-[11px] md:hidden mt-0.5 ${textMutedClass}`}>
                            ID: {project.projectId} · Owner: {isCreator ? "You" : project.creator?.username}
                          </span>
                        </div>
                      </div>

                      {/* ID (desktop) */}
                      <div className="hidden md:block col-span-2 font-mono text-xs tracking-wider text-neutral-400">
                        <span className={`px-2.5 py-1 rounded-md border text-[10px] font-semibold uppercase ${
                          isDark ? "bg-white/5 border-white/10 text-white/50" : "bg-neutral-50 border-neutral-200 text-neutral-600"
                        }`}>
                          {project.projectId}
                        </span>
                      </div>

                      {/* Creator (desktop) */}
                      <div className="hidden md:block col-span-2 text-sm">
                        <span className={isCreator ? "font-medium text-white/80" : "text-neutral-400"}>
                          {isCreator ? "You" : project.creator?.username}
                        </span>
                      </div>

                      {/* Collaborators Stack */}
                      <div className="col-span-6 md:col-span-2 flex items-center">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {project.members?.map((member, i) => (
                            <div
                              key={member._id || i}
                              title={member.username}
                              className={`w-6 h-6 rounded-full border flex items-center justify-center text-[8px] font-extrabold shrink-0 ${
                                isDark ? "bg-neutral-800 border-black text-white/70" : "bg-neutral-100 border-white text-neutral-600"
                              }`}
                            >
                              {member.username?.[0]?.toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <span className={`text-[10px] ml-2 ${textMutedClass}`}>
                          {project.members?.length || 0} total
                        </span>
                      </div>

                      {/* Action trigger button */}
                      <div className="col-span-6 md:col-span-1 text-right">
                        <Link
                          to={`/room/${project.projectId}`}
                          className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-150 ${
                            isDark
                              ? "bg-white/10 text-white hover:bg-white/20"
                              : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                          }`}
                        >
                          Join
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4H6.5M6.5 4L4.5 2M6.5 4L4.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
