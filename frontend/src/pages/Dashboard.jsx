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
  const navigate = useNavigate();

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
      // Navigate straight to the new project drawing room
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

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L6 6L10 10L14 2" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-[15px] tracking-tight">CollaboDraw</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border border-white/10 rounded-full px-3 py-1.5 bg-white/5 text-xs text-white/70">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span>{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Side: Create form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 border border-white/10 rounded-2xl bg-white/[0.02] p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-2">Create new project</h2>
            <p className="text-white/40 text-xs mb-6">Start a fresh project and collaborate with invited members.</p>

            {error && (
              <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/60">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-white/45 mb-2 font-medium tracking-wider uppercase">
                  Project name
                </label>
                <input
                  type="text"
                  placeholder="App Mockup, Brainstorm..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={createLoading || !name.trim()}
                className="w-full bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-white/90 active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createLoading ? "Creating..." : "Create Project →"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Project Listing */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Your Projects</h1>
            <p className="text-white/40 text-sm">Sketchrooms you created or have been invited to join.</p>
          </div>

          {loading ? (
            /* Skeletal Loader */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-2xl border border-white/10 bg-white/[0.01] animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            /* Empty state */
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <span className="text-4xl block mb-4">🎨</span>
              <p className="text-sm text-white/50 mb-1 font-semibold">No projects yet</p>
              <p className="text-xs text-white/35">Create your first project on the left to start drawing.</p>
            </div>
          ) : (
            /* Projects Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => {
                const isCreator = project.creator?._id === user?.id || project.creator === user?.id;
                return (
                  <Link
                    key={project.projectId}
                    to={`/room/${project.projectId}`}
                    className="border border-white/10 rounded-2xl bg-white/[0.02] p-6 hover:border-white/25 hover:bg-white/[0.03] transition-all duration-200 group flex flex-col justify-between h-40"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg group-hover:text-white text-white/90 truncate leading-snug">
                          {project.name}
                        </h3>
                        <span className="text-[10px] tracking-wider uppercase bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-white/40 shrink-0">
                          {project.projectId}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 mb-4">
                        Created by {isCreator ? "you" : project.creator?.username}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      {/* Members list preview */}
                      <div className="flex -space-x-2 overflow-hidden">
                        {project.members?.slice(0, 4).map((member, i) => (
                          <div
                            key={member._id || i}
                            title={member.username}
                            className="w-6 h-6 rounded-full bg-white/10 border border-black flex items-center justify-center text-[8px] font-bold text-white/80 shrink-0"
                          >
                            {member.username?.[0]?.toUpperCase()}
                          </div>
                        ))}
                        {project.members?.length > 4 && (
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-black flex items-center justify-center text-[7px] text-white/40 shrink-0">
                            +{project.members.length - 4}
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-white/30 group-hover:text-white/70 flex items-center gap-1 transition-colors">
                        Open Whiteboard
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="transform group-hover:translate-x-0.5 transition-transform">
                          <path d="M1.5 5H8.5M8.5 5L5.5 2M8.5 5L5.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
