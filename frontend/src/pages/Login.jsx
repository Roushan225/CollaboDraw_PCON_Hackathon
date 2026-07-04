import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [searchParams] = useSearchParams();
  const inviteProjectId = searchParams.get("invite");

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      if (inviteProjectId) {
        navigate(`/room/${inviteProjectId}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      
      {/* Dynamic Animated Whiteboard Sketch Background (Increased opacity for clear visibility) */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-70 select-none">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes bgDraw1 {
            0% { stroke-dashoffset: 1000; }
            50% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -1000; }
          }
          @keyframes bgFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(3deg); }
          }
          .animate-bg-stroke {
            stroke-dasharray: 1000;
            animation: bgDraw1 25s linear infinite;
          }
          .animate-bg-card {
            animation: bgFloat 8s ease-in-out infinite;
          }
        `}} />

        {/* Math/Vector Grid Layer */}
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Animated floating sketch lines */}
          <path
            d="M -100 200 C 300 50, 700 600, 1100 150 C 1500 -100, 1700 800, 2100 400"
            fill="none"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="3"
            className="animate-bg-stroke"
          />
          <path
            d="M 2100 900 C 1700 700, 1300 200, 900 800 C 500 1200, 100 -200, -100 300"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="2.5"
            strokeDasharray="15 10"
            className="animate-bg-stroke"
            style={{ animationDuration: "35s" }}
          />

          {/* Floating abstract geometry */}
          <g className="animate-bg-card">
            <rect x="10%" y="20%" width="120" height="80" rx="8" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
            <circle cx="10%" cy="20%" r="3" fill="rgba(255,255,255,0.2)" />
          </g>
          <g className="animate-bg-card" style={{ animationDelay: "-3s" }}>
            <circle cx="85%" cy="70%" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
            <line x1="85%" y1="70%" x2="90%" y2="60%" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      {/* Minimal navbar */}
      <nav className="border-b border-white/10 px-6 h-16 flex items-center justify-between relative z-10 bg-black/50 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 11.5L4.5 5.5L8 8.5L11.5 1.5" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight">CollaboDraw</span>
        </Link>
        <Link
          to={inviteProjectId ? `/signup?invite=${inviteProjectId}` : "/signup"}
          className="text-xs text-white/40 hover:text-white transition-colors"
        >
          No account? <span className="text-white underline underline-offset-2">Sign up</span>
        </Link>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">

        <div className="relative w-full max-w-sm">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 border border-white/15 rounded-full px-3 py-1.5 text-xs text-white/40 mb-6 bg-white/[0.03]">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse"/>
              Welcome back
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Sign in</h1>
            <p className="text-white/40 text-sm">Enter your credentials to continue drawing.</p>
          </div>

          {/* Form card */}
          <div className="border border-white/10 rounded-2xl bg-white/[0.02] p-8 backdrop-blur-xl shadow-2xl">

            {/* Error banner */}
            {error && (
              <div className="mb-5 flex items-center gap-2.5 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/70">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-white/40">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M7 4V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <circle cx="7" cy="10" r="0.7" fill="currentColor"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Email */}
              <div>
                <label className="block text-[10px] text-white/45 mb-2 font-extrabold tracking-wider uppercase">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full border border-white/10 rounded-xl px-3.5 py-2.5 text-xs bg-white/5 text-white outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] text-white/45 font-extrabold tracking-wider uppercase">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="text-[10px] text-white/40 hover:text-white transition-colors"
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full border border-white/10 rounded-xl px-3.5 py-2.5 text-xs bg-white/5 text-white outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center bg-white hover:bg-neutral-100 text-black text-xs font-bold py-3 rounded-xl transition-all duration-150 active:scale-95 shadow-lg"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

            </form>
          </div>

          <p className="text-center text-xs text-white/40 mt-8">
            Don&apos;t have an account?{" "}
            <Link
              to={inviteProjectId ? `/signup?invite=${inviteProjectId}` : "/signup"}
              className="text-white underline underline-offset-2"
            >
              Sign up for free
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
