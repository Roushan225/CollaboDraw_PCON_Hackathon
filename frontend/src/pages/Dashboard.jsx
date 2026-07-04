import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Selected project ID for filtering slides (null means 'All Files' / All Projects selected)
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Theme check: light (premium white) or dark
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const isDark = theme === "dark";

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

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
      const res = await api.post("/projects", { name: name.trim() });
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
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Compile Slide Items depending on folder selection
  const slideItems = [];
  if (selectedProjectId === null) {
    // All Projects selected: Flatten all slides
    projects.forEach((proj) => {
      proj.slides?.forEach((slide) => {
        slideItems.push({
          ...slide,
          project: proj,
        });
      });
    });
  } else {
    // Specific Project selected: Filter slides belonging to it
    const activeProject = projects.find((p) => p.projectId === selectedProjectId);
    if (activeProject) {
      activeProject.slides?.forEach((slide) => {
        slideItems.push({
          ...slide,
          project: activeProject,
        });
      });
    }
  }

  // Filter slide items by search query
  const filteredSlides = slideItems.filter((slide) =>
    slide.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // B&W theme classes
  const bgClass = isDark ? "bg-[#0c0c0e] text-white" : "bg-[#f9f9fb] text-neutral-900";
  const sidebarBg = isDark ? "bg-black border-white/10" : "bg-white border-neutral-200";
  const mainBg = isDark ? "bg-[#0c0c0e]" : "bg-[#fcfcfd]";
  const borderClass = isDark ? "border-white/10" : "border-neutral-200/80";
  const textMuted = isDark ? "text-white/40" : "text-neutral-400";
  const textSecondary = isDark ? "text-white/60" : "text-neutral-500";
  const listHoverClass = isDark ? "hover:bg-white/5" : "hover:bg-neutral-50";

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hrs ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className={`min-h-screen font-sans antialiased flex transition-colors duration-300 ${bgClass}`}>
      
      {/* 1. LEFT SIDEBAR (Roshan's Team Layout) */}
      <aside className={`w-64 border-r flex flex-col justify-between p-5 shrink-0 select-none ${sidebarBg}`}>
        <div className="flex flex-col gap-6">
          {/* Logo / Team Selector Header */}
          <div className="flex items-center justify-between p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                isDark ? "bg-white text-black" : "bg-neutral-950 text-white"
              }`}>
                ▲
              </div>
              <span className="font-extrabold text-[14px] tracking-tight truncate max-w-[120px]">
                {user?.username}&apos;s Team
              </span>
            </div>
            <span className={`text-[10px] ${textMuted}`}>▼</span>
          </div>

          {/* Navigation Section */}
          <div className="flex flex-col gap-1">
            <div
              onClick={() => setSelectedProjectId(null)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedProjectId === null
                  ? (isDark ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-900 shadow-sm border border-neutral-200/40")
                  : `${listHoverClass} ${textSecondary}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>📁</span>
                <span>All Files</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${isDark ? "border-white/10 bg-white/5 text-white/40" : "border-neutral-200 bg-neutral-50 text-neutral-400"}`}>A</span>
            </div>
          </div>

          {/* Team Folders Section — Lists active Project Folders */}
          <div>
            <div className="flex items-center justify-between px-3.5 mb-2.5">
              <span className={`text-[10px] font-extrabold tracking-wider uppercase ${textMuted}`}>Team Folders</span>
              <button onClick={() => setShowCreateModal(true)} className={`text-xs hover:text-white ${textMuted}`}>+</button>
            </div>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {projects.map((proj) => {
                const isActive = selectedProjectId === proj.projectId;
                return (
                  <div
                    key={proj.projectId}
                    onClick={() => setSelectedProjectId(proj.projectId)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? (isDark ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-900 border border-neutral-200/40")
                        : `${listHoverClass} ${textSecondary}`
                    }`}
                  >
                    <span>📁</span>
                    <span className="truncate">{proj.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Bottom Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className={`w-full flex items-center justify-center gap-1.5 font-bold text-xs py-3 rounded-xl transition-all duration-150 active:scale-95 border ${
              isDark
                ? "bg-white text-black hover:bg-neutral-100 border-transparent"
                : "bg-neutral-900 text-white hover:bg-neutral-800 border-neutral-900 shadow-md"
            }`}
          >
            <span>+ New File</span>
            <span className="opacity-40">^ N</span>
          </button>

          <div className={`h-px ${borderClass}`} />

          <div className="flex items-center justify-between px-2">
            {/* Profile badge & logout button */}
            <div className="flex items-center gap-2 text-xs font-medium">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isDark ? "bg-white/10 text-white" : "bg-neutral-200 text-neutral-800"
              }`}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span className="truncate max-w-[90px]">{user?.username}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="text-[10px] text-red-500/70 hover:text-red-500 font-bold uppercase tracking-wider transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className={`flex-1 flex flex-col p-8 transition-colors duration-300 ${mainBg}`}>
        
        {/* Main top header bar inside content area */}
        <header className="flex items-center justify-between border-b pb-5 mb-8 border-neutral-200/50">
          {/* Main workspace navigation tabs */}
          <div className="flex items-center gap-5 text-xs font-bold">
            <span className={`cursor-pointer pb-2 border-b-2 ${isDark ? "border-white text-white" : "border-neutral-900 text-neutral-900"}`}>All</span>
            <span className={`cursor-pointer pb-2 hover:text-white ${textMuted}`}>Recents</span>
            <span className={`cursor-pointer pb-2 hover:text-white ${textMuted}`}>Created by Me</span>
            <span className={`cursor-pointer pb-2 hover:text-white ${textMuted}`}>Folders</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input Box */}
            <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 w-60 ${borderClass} ${
              isDark ? "bg-white/[0.02]" : "bg-white shadow-sm"
            }`}>
              <span className="text-xs">🔍</span>
              <input
                type="text"
                placeholder="Search slides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs placeholder-neutral-400 outline-none w-full"
              />
              <span className={`text-[8px] px-1 rounded border font-mono ${isDark ? "border-white/10 bg-white/5 text-white/30" : "border-neutral-200 bg-neutral-50 text-neutral-400"}`}>⌘K</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all duration-200 hover:scale-105 ${borderClass} ${
                isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white hover:bg-neutral-50 shadow-sm text-neutral-800"
              }`}
              title={isDark ? "Switch to Premium White" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="8" cy="8" r="3" />
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 10.5a5 5 0 1 1-5-8.5A5.5 5.5 0 1 0 12 10.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* 3. CREATE BLANK CARD SECTION (Middle area) */}
        <section className="mb-10">
          <div
            onClick={() => setShowCreateModal(true)}
            className={`w-64 h-36 border rounded-2xl flex flex-col justify-between p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
              isDark
                ? "bg-white/[0.01] hover:bg-white/[0.03] border-white/10"
                : "bg-white hover:bg-neutral-50/50 border-neutral-200/80 shadow-sm"
            }`}
          >
            <div className={`text-2xl font-semibold opacity-40`}>+</div>
            <div>
              <h3 className="text-xs font-extrabold tracking-tight">Create a Blank File</h3>
              <p className={`text-[10px] mt-0.5 ${textMuted}`}>Start drawing instantly on a clean whiteboard canvas.</p>
            </div>
          </div>
        </section>

        {/* 4. DIRECTORY SLIDES TABLE LIST (Bottom area) */}
        <section className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider">
              {selectedProjectId === null ? "All Board Slides" : "Project Slides"}
            </h2>
            <span className={`text-[10px] font-bold ${textMuted}`}>{filteredSlides.length} total slides</span>
          </div>

          {loading ? (
            /* Loader skeleton */
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-14 rounded-xl border animate-pulse ${borderClass} ${isDark ? "bg-white/[0.01]" : "bg-white"}`} />
              ))}
            </div>
          ) : filteredSlides.length === 0 ? (
            /* Empty state */
            <div className={`text-center py-20 border border-dashed rounded-3xl ${borderClass} ${isDark ? "bg-white/[0.005]" : "bg-neutral-50/50"}`}>
              <span className="text-3xl block mb-3">📂</span>
              <h3 className="font-extrabold text-sm mb-1 tracking-tight">No slide canvases found</h3>
              <p className={`text-xs ${textMuted} max-w-xs mx-auto mb-5`}>
                Click the &quot;New File&quot; sidebar button to add a new project space and slides.
              </p>
            </div>
          ) : (
            /* Structured Slide Directory Table */
            <div className={`border rounded-2xl overflow-hidden ${borderClass} ${isDark ? "bg-black" : "bg-white shadow-sm"}`}>
              
              {/* Dynamic Table Header depends on whether "All Files" (extra project column) or single project is selected */}
              <div className={`hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider border-b ${borderClass} ${
                isDark ? "bg-white/[0.015] text-white/30" : "bg-neutral-50/80 text-neutral-400"
              }`}>
                {selectedProjectId === null ? (
                  // Headers with Project Name Column (All Projects selected)
                  <>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-3">Project Name</div>
                    <div className="col-span-2">Created</div>
                    <div className="col-span-2">Author</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </>
                ) : (
                  // Headers for a single project selection (No project name column needed)
                  <>
                    <div className="col-span-5">Name</div>
                    <div className="col-span-3">Created</div>
                    <div className="col-span-3">Author</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </>
                )}
              </div>

              {/* Rows list */}
              <div className={`divide-y ${isDark ? "divide-white/5" : "divide-neutral-100"}`}>
                {filteredSlides.map((slide) => {
                  const isCreator = slide.project?.creator?._id === user?.id || slide.project?.creator === user?.id;
                  const targetLink = `/room/${slide.project?.projectId}?slide=${slide.slideId}`;

                  return (
                    <div
                      key={slide.slideId}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-4 transition-colors duration-100 ${listHoverClass}`}
                    >
                      {selectedProjectId === null ? (
                        // 1. ALL FILES SELECTED LAYOUT (Colspan adjusted for Project Name column)
                        <>
                          {/* Slide Name */}
                          <div className="col-span-12 md:col-span-4 flex items-center gap-3.5">
                            <span className="text-base select-none shrink-0">📄</span>
                            <div className="truncate">
                              <Link
                                to={targetLink}
                                className="font-extrabold text-sm hover:underline leading-snug tracking-tight"
                              >
                                {slide.name}
                              </Link>
                              <span className={`block text-[10px] md:hidden mt-0.5 ${textMuted}`}>
                                Project: {slide.project?.name} · {formatDate(slide.project?.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Extra Column: Project Name */}
                          <div className="hidden md:block col-span-3 text-xs font-bold truncate">
                            <span className={textSecondary}>{slide.project?.name}</span>
                          </div>

                          {/* Created date */}
                          <div className="hidden md:block col-span-2 text-xs font-semibold">
                            <span className={textSecondary}>{formatDate(slide.project?.createdAt)}</span>
                          </div>

                          {/* Author badge */}
                          <div className="hidden md:block col-span-2 text-xs">
                            <div className="flex items-center gap-2">
                              <div
                                title={slide.project?.creator?.username}
                                className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-extrabold border shrink-0 ${
                                  isDark ? "bg-neutral-800 border-white/10 text-white/70" : "bg-neutral-100 border-neutral-200 text-neutral-700"
                                }`}
                              >
                                {slide.project?.creator?.username?.[0]?.toUpperCase()}
                              </div>
                              <span className={`font-semibold truncate max-w-[80px] ${textSecondary}`}>
                                {isCreator ? "You" : slide.project?.creator?.username}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        // 2. SINGLE PROJECT SELECTED LAYOUT
                        <>
                          {/* Slide Name */}
                          <div className="col-span-12 md:col-span-5 flex items-center gap-3.5">
                            <span className="text-base select-none shrink-0">📄</span>
                            <div className="truncate">
                              <Link
                                to={targetLink}
                                className="font-extrabold text-sm hover:underline leading-snug tracking-tight"
                              >
                                {slide.name}
                              </Link>
                              <span className={`block text-[10px] md:hidden mt-0.5 ${textMuted}`}>
                                {formatDate(slide.project?.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Created date */}
                          <div className="hidden md:block col-span-3 text-xs font-semibold">
                            <span className={textSecondary}>{formatDate(slide.project?.createdAt)}</span>
                          </div>

                          {/* Author badge */}
                          <div className="hidden md:block col-span-3 text-xs">
                            <div className="flex items-center gap-2">
                              <div
                                title={slide.project?.creator?.username}
                                className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-extrabold border shrink-0 ${
                                  isDark ? "bg-neutral-800 border-white/10 text-white/70" : "bg-neutral-100 border-neutral-200 text-neutral-700"
                                }`}
                              >
                                {slide.project?.creator?.username?.[0]?.toUpperCase()}
                              </div>
                              <span className={`font-semibold truncate max-w-[120px] ${textSecondary}`}>
                                {isCreator ? "You" : slide.project?.creator?.username}
                              </span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Join slide link */}
                      <div className="col-span-12 md:col-span-1 text-right">
                        <Link
                          to={targetLink}
                          className={`inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded-lg border transition-all duration-100 ${
                            isDark
                              ? "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                              : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-sm"
                          }`}
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 5. CREATE FILE SPACE DIALOG OVERLAY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-sm border rounded-2xl p-6 shadow-2xl transition-colors duration-300 ${
              isDark ? "bg-[#0d0d0f] border-white/10 text-white" : "bg-white border-neutral-200 text-neutral-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-sm tracking-tight">Create a New File</h3>
              <button
                onClick={() => { setShowCreateModal(false); setName(""); setError(""); }}
                className={`text-xs ${textMuted} hover:text-white`}
              >
                ✕
              </button>
            </div>
            <p className={`text-[10px] mb-4 ${textMuted}`}>Create a collaborative board, invite other team members by searching their names.</p>

            {error && (
              <div className="mb-4 text-[10px] text-red-400 bg-red-950/20 border border-red-900/50 p-2 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Enter file/project name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-white/30 ${
                  isDark ? "bg-white/5 border-white/10 text-white" : "bg-neutral-50 border-neutral-200 text-neutral-900"
                }`}
              />

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setName(""); setError(""); }}
                  className={`text-[10px] font-bold px-3 py-2 rounded-lg border ${
                    isDark ? "border-white/10 hover:bg-white/5 text-white/70" : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !name.trim()}
                  className={`text-[10px] font-bold px-4 py-2 rounded-lg ${
                    isDark ? "bg-white text-black hover:bg-neutral-100" : "bg-neutral-900 text-white hover:bg-neutral-800"
                  }`}
                >
                  {createLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
