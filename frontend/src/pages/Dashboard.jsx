import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const Icon = ({ name, className = "w-4 h-4" }) => {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const icons = {
    logo: (
      <svg {...common}>
        <path d="M4 17.5 8.5 7l5 6 6-9.5" />
        <path d="M4 20h16" />
      </svg>
    ),
    folder: (
      <svg {...common}>
        <path d="M3 6.5h6l2 2H21v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11Z" />
      </svg>
    ),
    file: (
      <svg {...common}>
        <path d="M7 3.5h7l4 4v13H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
        <path d="M14 3.5v4h4" />
      </svg>
    ),
    plus: (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    search: (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    ),
    sun: (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    ),
    moon: (
      <svg {...common}>
        <path d="M20 14.2A7.7 7.7 0 0 1 9.8 4 8 8 0 1 0 20 14.2Z" />
      </svg>
    ),
    logout: (
      <svg {...common}>
        <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" />
        <path d="M14 8l4 4-4 4M18 12H9" />
      </svg>
    ),
    open: (
      <svg {...common}>
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    ),
    users: (
      <svg {...common}>
        <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
        <circle cx="10" cy="7" r="3" />
        <path d="M20 20v-1.2a3 3 0 0 0-2-2.8" />
        <path d="M16.5 4.4a3 3 0 0 1 0 5.2" />
      </svg>
    ),
    clock: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  };

  return icons[name] || null;
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const isDark = theme === "dark";

  const navigate = useNavigate();

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
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const loggedInUserId = user?._id || user?.id;
  const activeProject = projects.find((p) => p.projectId === selectedProjectId);
  const totalSlides = projects.reduce((sum, project) => sum + (project.slides?.length || 0), 0);
  const createdByMeCount = projects.filter((project) => {
    const creatorId = project.creator?._id || project.creator;
    return loggedInUserId && creatorId && creatorId.toString() === loggedInUserId.toString();
  }).length;

  let slideItems = [];
  const sourceProjects = selectedProjectId === null ? projects : activeProject ? [activeProject] : [];
  sourceProjects.forEach((project) => {
    project.slides?.forEach((slide) => {
      slideItems.push({ ...slide, project });
    });
  });

  if (activeTab === "recents") {
    slideItems = [...slideItems].sort((a, b) => {
      const dateA = new Date(a.lastModifiedAt || a.project?.createdAt || 0);
      const dateB = new Date(b.lastModifiedAt || b.project?.createdAt || 0);
      return dateB - dateA;
    });
  } else if (activeTab === "created-by-me") {
    slideItems = slideItems.filter((slide) => {
      const creatorId = slide.project?.creator?._id || slide.project?.creator;
      return loggedInUserId && creatorId && creatorId.toString() === loggedInUserId.toString();
    });
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSlides = slideItems.filter((slide) => {
    if (!normalizedSearch) return true;
    return (
      slide.name.toLowerCase().includes(normalizedSearch) ||
      slide.project?.name?.toLowerCase().includes(normalizedSearch)
    );
  });

  const filteredProjects = projects.filter((project) => {
    if (!normalizedSearch) return true;
    return project.name.toLowerCase().includes(normalizedSearch);
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const shellClass = isDark ? "bg-[#08080a] text-white" : "bg-[#f4f4f5] text-neutral-950";
  const sidebarClass = isDark ? "bg-black border-white/10" : "bg-white border-neutral-200";
  const panelClass = isDark ? "bg-[#0e0e11] border-white/10" : "bg-white border-neutral-200";
  const panelSoftClass = isDark ? "bg-white/[0.035] border-white/10" : "bg-neutral-50 border-neutral-200";
  const borderClass = isDark ? "border-white/10" : "border-neutral-200";
  const textMuted = isDark ? "text-white/42" : "text-neutral-500";
  const textSubtle = isDark ? "text-white/62" : "text-neutral-600";
  const hoverClass = isDark ? "hover:bg-white/[0.06]" : "hover:bg-neutral-100";
  const activeClass = isDark ? "bg-white text-black" : "bg-neutral-950 text-white";

  const tabs = [
    { id: "all", label: "All", count: slideItems.length },
    { id: "recents", label: "Recents", count: filteredSlides.length },
    { id: "created-by-me", label: "Created by Me", count: createdByMeCount },
    { id: "folders", label: "Folders", count: projects.length },
  ];

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-300 ${shellClass}`}>
      <div className="flex min-h-screen">
        <aside className={`hidden lg:flex w-[272px] shrink-0 flex-col border-r ${sidebarClass}`}>
          <div className="flex h-16 items-center gap-3 border-b px-5 border-inherit">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${isDark ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
              <Icon name="logo" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight">CollaboDraw</p>
              <p className={`truncate text-[11px] font-medium ${textMuted}`}>{user?.username || "Workspace"} workspace</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <button
              onClick={() => {
                setSelectedProjectId(null);
                setActiveTab("all");
              }}
              className={`mb-5 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-bold transition ${selectedProjectId === null ? activeClass : `${hoverClass} ${textSubtle}`}`}
            >
              <span className="flex items-center gap-2.5">
                <Icon name="folder" className="h-4 w-4" />
                All Files
              </span>
              <span className="text-[10px] opacity-70">{totalSlides}</span>
            </button>

            <div className="mb-3 flex items-center justify-between px-2">
              <span className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${textMuted}`}>Projects</span>
              <button
                onClick={() => setShowCreateModal(true)}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${borderClass} ${hoverClass}`}
                title="Create project"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {projects.map((project) => {
                const isActive = selectedProjectId === project.projectId;
                return (
                  <button
                    key={project.projectId}
                    onClick={() => {
                      setSelectedProjectId(project.projectId);
                      if (activeTab === "folders") setActiveTab("all");
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${isActive ? activeClass : `${hoverClass} ${textSubtle}`}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon name="folder" className="h-4 w-4 shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </span>
                    <span className="shrink-0 text-[10px] opacity-65">{project.slides?.length || 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t p-4 border-inherit">
            <button
              onClick={() => setShowCreateModal(true)}
              className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-extrabold transition active:scale-[0.98] ${activeClass}`}
            >
              <Icon name="plus" className="h-4 w-4" />
              New Board
            </button>

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold ${isDark ? "border-white/10 bg-white/10" : "border-neutral-200 bg-neutral-100"}`}>
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{user?.username}</p>
                  <p className={`text-[10px] font-medium ${textMuted}`}>Signed in</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${borderClass} ${hoverClass}`}
                title="Logout"
              >
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${isDark ? "border-white/10 bg-[#08080a]/88" : "border-neutral-200 bg-[#f4f4f5]/88"}`}>
            <div className="flex min-h-16 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="flex min-w-0 items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${textMuted}`}>
                    {selectedProjectId === null ? "Workspace" : "Project"}
                  </p>
                  <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
                    {selectedProjectId === null ? `${user?.username || "Your"} boards` : activeProject?.name}
                  </h1>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border lg:hidden ${activeClass}`}
                  title="New board"
                >
                  <Icon name="plus" className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className={`flex h-10 min-w-0 items-center gap-2 rounded-lg border px-3 ${panelClass} sm:w-72`}>
                  <Icon name="search" className={`h-4 w-4 shrink-0 ${textMuted}`} />
                  <input
                    type="text"
                    placeholder={activeTab === "folders" ? "Search projects" : "Search boards or projects"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
                  />
                </div>

                <button
                  onClick={toggleTheme}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${panelClass} ${hoverClass}`}
                  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  <Icon name={isDark ? "sun" : "moon"} className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className={`hidden h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold transition active:scale-[0.98] lg:flex ${activeClass}`}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  New Board
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <section className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className={`rounded-lg border p-4 ${panelClass}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-[0.16em] ${textMuted}`}>Projects</span>
                  <Icon name="folder" className={`h-4 w-4 ${textMuted}`} />
                </div>
                <p className="text-2xl font-extrabold tracking-tight">{projects.length}</p>
              </div>

              <div className={`rounded-lg border p-4 ${panelClass}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-[0.16em] ${textMuted}`}>Slides</span>
                  <Icon name="file" className={`h-4 w-4 ${textMuted}`} />
                </div>
                <p className="text-2xl font-extrabold tracking-tight">{totalSlides}</p>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className={`rounded-lg border p-4 text-left transition ${panelSoftClass} ${hoverClass}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-[0.16em] ${textMuted}`}>Quick Start</span>
                  <Icon name="plus" className="h-4 w-4" />
                </div>
                <p className="text-sm font-extrabold">Create a blank board</p>
                <p className={`mt-1 text-xs ${textMuted}`}>Open a fresh collaborative canvas.</p>
              </button>
            </section>

            <section className={`mb-6 w-full overflow-x-auto sm:w-fit sm:max-w-full rounded-lg border p-1 ${panelClass}`}>
              <div className="flex w-max items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-extrabold transition ${
                      activeTab === tab.id ? activeClass : `${textSubtle} ${hoverClass}`
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-65">{tab.count}</span>
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "folders" ? (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold tracking-tight">Project folders</h2>
                    <p className={`mt-1 text-xs ${textMuted}`}>{filteredProjects.length} folders visible</p>
                  </div>
                </div>

                {loading ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className={`h-32 animate-pulse rounded-lg border ${panelClass}`} />
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <EmptyState
                    isDark={isDark}
                    borderClass={borderClass}
                    textMuted={textMuted}
                    onCreate={() => setShowCreateModal(true)}
                    title="No projects found"
                    description="Create a board or adjust your search to reveal existing projects."
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.projectId}
                        onClick={() => {
                          setSelectedProjectId(project.projectId);
                          setActiveTab("all");
                        }}
                        className={`rounded-lg border p-4 text-left transition ${panelClass} ${hoverClass}`}
                      >
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${panelSoftClass}`}>
                            <Icon name="folder" className="h-5 w-5" />
                          </div>
                          <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${borderClass} ${textMuted}`}>
                            {project.projectId}
                          </span>
                        </div>
                        <h3 className="truncate text-sm font-extrabold">{project.name}</h3>
                        <div className={`mt-3 flex items-center justify-between text-xs ${textMuted}`}>
                          <span>{project.slides?.length || 0} slides</span>
                          <span>{formatDate(project.createdAt)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold tracking-tight">
                      {selectedProjectId === null ? "Board slides" : `${activeProject?.name || "Project"} slides`}
                    </h2>
                    <p className={`mt-1 text-xs ${textMuted}`}>{filteredSlides.length} slides visible</p>
                  </div>
                </div>

                {loading ? (
                  <div className={`overflow-hidden rounded-lg border ${panelClass}`}>
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className={`h-16 animate-pulse border-b last:border-b-0 ${borderClass} ${isDark ? "bg-white/[0.02]" : "bg-neutral-50"}`} />
                    ))}
                  </div>
                ) : filteredSlides.length === 0 ? (
                  <EmptyState
                    isDark={isDark}
                    borderClass={borderClass}
                    textMuted={textMuted}
                    onCreate={() => setShowCreateModal(true)}
                    title="No slides found"
                    description="Create a new board or adjust your filters to find a slide."
                  />
                ) : (
                  <div className={`overflow-hidden rounded-lg border ${panelClass}`}>
                    <div className={`hidden grid-cols-12 gap-4 border-b px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.16em] md:grid ${borderClass} ${textMuted}`}>
                      <div className={selectedProjectId === null ? "col-span-3" : "col-span-4"}>Name</div>
                      {selectedProjectId === null && <div className="col-span-2">Project</div>}
                      <div className="col-span-3">Last Change</div>
                      <div className="col-span-2">Created</div>
                      <div className={selectedProjectId === null ? "col-span-1" : "col-span-2"}>Owner</div>
                      <div className="col-span-1 text-right">Open</div>
                    </div>

                    <div className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-neutral-100"}`}>
                      {filteredSlides.map((slide) => {
                        const creatorId = slide.project?.creator?._id || slide.project?.creator;
                        const isCreator = loggedInUserId && creatorId && creatorId.toString() === loggedInUserId.toString();
                        const targetLink = `/room/${slide.project?.projectId}?slide=${slide.slideId}`;
                        const lastChange = slide.lastModifiedAt || slide.project?.createdAt;

                        return (
                          <div
                            key={`${slide.project?.projectId}-${slide.slideId}`}
                            className={`grid grid-cols-1 gap-4 px-5 py-4 transition md:grid-cols-12 md:items-center ${hoverClass}`}
                          >
                            <div className={`${selectedProjectId === null ? "md:col-span-3" : "md:col-span-4"} flex min-w-0 items-center gap-3`}>
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${panelSoftClass}`}>
                                <Icon name="file" className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <Link to={targetLink} className="block truncate text-sm font-extrabold hover:underline">
                                  {slide.name}
                                </Link>
                                <p className={`mt-1 truncate text-xs md:hidden ${textMuted}`}>
                                  {slide.project?.name} / {formatDate(lastChange)}
                                </p>
                              </div>
                            </div>

                            {selectedProjectId === null && (
                              <div className="hidden min-w-0 md:col-span-2 md:block">
                                <span className={`block truncate text-xs font-bold ${textSubtle}`}>{slide.project?.name}</span>
                              </div>
                            )}

                            <div className="hidden md:col-span-3 md:block">
                              <div className="flex items-center gap-2">
                                <Icon name="clock" className={`h-4 w-4 shrink-0 ${textMuted}`} />
                                <div className="min-w-0">
                                  <p className={`truncate text-xs font-semibold ${textSubtle}`}>{formatDate(lastChange)}</p>
                                  {(slide.lastModifiedBy?.username || slide.project?.creator?.username) && (
                                    <p className={`mt-0.5 truncate text-[10px] ${textMuted}`}>
                                      by {slide.lastModifiedBy?.username || slide.project?.creator?.username}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="hidden md:col-span-2 md:block">
                              <span className={`text-xs font-semibold ${textSubtle}`}>{formatDate(slide.project?.createdAt)}</span>
                            </div>

                            <div className={`hidden ${selectedProjectId === null ? "md:col-span-1" : "md:col-span-2"} md:block`}>
                              <div className="flex min-w-0 items-center gap-2">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-extrabold ${panelSoftClass}`}>
                                  {slide.project?.creator?.username?.[0]?.toUpperCase()}
                                </div>
                                <span className={`truncate text-xs font-semibold ${textSubtle}`}>
                                  {isCreator ? "You" : slide.project?.creator?.username}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-end md:col-span-1">
                              <Link
                                to={targetLink}
                                className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition ${panelSoftClass} ${hoverClass}`}
                              >
                                <Icon name="open" className="h-3.5 w-3.5" />
                                <span className="md:hidden xl:inline">Open</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-lg border p-6 shadow-2xl ${panelClass}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Create a new board</h3>
                <p className={`mt-1 text-xs ${textMuted}`}>Name the workspace and jump straight into the canvas.</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setName("");
                  setError("");
                }}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${borderClass} ${hoverClass}`}
                title="Close"
              >
                x
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className={`text-[11px] font-extrabold uppercase tracking-[0.16em] ${textMuted}`}>Board name</span>
                <input
                  type="text"
                  placeholder="Product sketch, sprint map, wireframe..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className={`h-11 rounded-lg border px-3.5 text-sm outline-none transition focus:border-current ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/28" : "bg-neutral-50 border-neutral-200 text-neutral-950 placeholder:text-neutral-400"}`}
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setName("");
                    setError("");
                  }}
                  className={`h-10 rounded-lg border px-4 text-xs font-extrabold transition ${borderClass} ${hoverClass}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !name.trim()}
                  className={`h-10 rounded-lg px-4 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${activeClass}`}
                >
                  {createLoading ? "Creating..." : "Create board"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ isDark, borderClass, textMuted, title, description, onCreate }) {
  return (
    <div className={`flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center ${borderClass} ${isDark ? "bg-white/[0.015]" : "bg-white"}`}>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg border ${borderClass} ${isDark ? "bg-white/[0.04]" : "bg-neutral-50"}`}>
        <Icon name="folder" className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
      <p className={`mt-2 max-w-sm text-xs leading-5 ${textMuted}`}>{description}</p>
      <button
        onClick={onCreate}
        className={`mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-extrabold transition ${isDark ? "bg-white text-black hover:bg-neutral-100" : "bg-neutral-950 text-white hover:bg-neutral-800"}`}
      >
        <Icon name="plus" className="h-4 w-4" />
        New Board
      </button>
    </div>
  );
}
