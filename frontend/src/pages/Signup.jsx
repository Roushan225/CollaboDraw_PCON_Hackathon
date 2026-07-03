import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [form, setForm]       = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  // Simple client-side password strength score 0-4
  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 6)  s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9!@#$%^&*]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-white/20", "bg-white/40", "bg-white/70", "bg-white"][strength];

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      return setError("Passwords do not match");
    }
    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Minimal navbar */}
      <nav className="border-b border-white/10 px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 11.5L4.5 5.5L8 8.5L11.5 1.5" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold">CollaboDraw</span>
        </Link>
        <Link to="/login" className="text-xs text-white/40 hover:text-white transition-colors">
          Have an account? <span className="text-white underline underline-offset-2">Sign in</span>
        </Link>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">

        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[500px] rounded-full bg-white/[0.04] blur-[120px]"/>
        </div>

        <div className="relative w-full max-w-sm">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 border border-white/15 rounded-full px-3 py-1.5 text-xs text-white/40 mb-6 bg-white/[0.03]">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50"/>
              Free · No credit card
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Create account</h1>
            <p className="text-white/40 text-sm">Join CollaboDraw and start collaborating.</p>
          </div>

          {/* Form card */}
          <div className="border border-white/10 rounded-2xl bg-white/[0.02] p-8 backdrop-blur-sm">

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

              {/* Username */}
              <div>
                <label className="block text-xs text-white/45 mb-2 font-medium tracking-wide uppercase">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="roushan225"
                  required
                  minLength={3}
                  autoComplete="username"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all duration-200"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs text-white/45 mb-2 font-medium tracking-wide uppercase">
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs text-white/45 mb-2 font-medium tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    aria-label={showPass ? "Hide" : "Show"}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 2L14 14M6.5 6.6A2 2 0 0 0 9.4 9.5M4.1 4.2C2.8 5.1 1.8 6.4 1.3 8c1 3 3.9 5 6.7 5 1.3 0 2.5-.4 3.6-1M6.3 3.1C6.8 3 7.4 3 8 3c2.8 0 5.7 2 6.7 5-.4 1.1-1 2.1-1.8 2.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1.3 8C2.3 5 5.2 3 8 3s5.7 2 6.7 5c-1 3-3.9 5-6.7 5S2.3 11 1.3 8z" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password strength bar */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div
                          key={i}
                          className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-white/10"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-white/30">{strengthLabel}</p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs text-white/45 mb-2 font-medium tracking-wide uppercase">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    name="confirm"
                    value={form.confirm}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/20 outline-none transition-all duration-200 ${
                      form.confirm && form.password !== form.confirm
                        ? "border-white/30 focus:border-white/40"
                        : "border-white/10 focus:border-white/30 focus:bg-white/[0.07]"
                    }`}
                  />
                  {/* Match indicator */}
                  {form.confirm && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {form.password === form.confirm ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3L11 11M11 3L3 11" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.3"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-white/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    Creating account…
                  </>
                ) : "Create account →"}
              </button>

              {/* Terms note */}
              <p className="text-center text-xs text-white/20 mt-1">
                By signing up you agree to our{" "}
                <a href="#" className="underline underline-offset-2 hover:text-white/40 transition-colors">Terms</a>
                {" "}and{" "}
                <a href="#" className="underline underline-offset-2 hover:text-white/40 transition-colors">Privacy Policy</a>.
              </p>
            </form>
          </div>

          {/* Footer link */}
          <p className="text-center text-xs text-white/30 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-white underline underline-offset-2 hover:text-white/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
