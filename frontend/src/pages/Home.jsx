import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────
   SMOOTH-SCROLL helper
───────────────────────────────────────────── */
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ─────────────────────────────────────────────
   FEATURES DATA  (expanded with visual + extra detail)
───────────────────────────────────────────── */
const FEATURES = [
  {
    id: "realtime",
    icon: "✦",
    tag: "Core",
    title: "Real-Time Collaboration",
    headline: "Every stroke, everywhere, instantly.",
    desc: "CollaboDraw broadcasts every pen movement to all room members in real time via Socket.io. There's no refresh, no reload — just a live shared canvas that feels like everyone is sitting at the same desk.",
    bullets: [
      "Sub-50ms stroke broadcast",
      "Cursor presence for each user",
      "Auto-reconnect on drop",
    ],
    visual: (
      <svg viewBox="0 0 420 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="420" height="260" fill="#0a0a0a" rx="12"/>
        {/* grid */}
        <defs>
          <pattern id="f1g" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0L0 0 0 28" fill="none" stroke="white" strokeWidth="0.3" opacity="0.08"/>
          </pattern>
        </defs>
        <rect width="420" height="260" fill="url(#f1g)"/>
        {/* live strokes */}
        <path d="M40 180 Q 120 100 200 150 T 380 130" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85"/>
        <path d="M60 220 Q 140 160 240 190 T 400 170" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
        {/* user A cursor */}
        <g transform="translate(200,148)">
          <path d="M0 0L0 12L3.5 8.5L6 14L8 13L5.5 7.5L10 7.5Z" fill="white" opacity="0.9"/>
          <rect x="12" y="10" width="36" height="13" rx="3" fill="white" opacity="0.12"/>
          <text x="15" y="20" fontSize="7.5" fill="white" opacity="0.9" fontFamily="monospace">Roushan</text>
        </g>
        {/* user B cursor */}
        <g transform="translate(310,135)">
          <path d="M0 0L0 12L3.5 8.5L6 14L8 13L5.5 7.5L10 7.5Z" fill="white" opacity="0.5"/>
          <rect x="12" y="10" width="28" height="13" rx="3" fill="white" opacity="0.10"/>
          <text x="15" y="20" fontSize="7.5" fill="white" opacity="0.6" fontFamily="monospace">Alex</text>
        </g>
        {/* pulse rings */}
        <circle cx="200" cy="148" r="6" fill="none" stroke="white" strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="6;18" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.4;0" dur="1.4s" repeatCount="indefinite"/>
        </circle>
        {/* online badge */}
        <rect x="14" y="14" width="88" height="22" rx="6" fill="white" opacity="0.07"/>
        <circle cx="25" cy="25" r="4" fill="#4ade80" opacity="0.85">
          <animate attributeName="opacity" values="0.85;0.3;0.85" dur="2s" repeatCount="indefinite"/>
        </circle>
        <text x="33" y="29" fontSize="8" fill="white" opacity="0.6" fontFamily="monospace">3 online</text>
      </svg>
    ),
  },
  {
    id: "canvas",
    icon: "⬡",
    tag: "Canvas",
    title: "Infinite Canvas",
    headline: "No borders. No limits.",
    desc: "The drawing surface in CollaboDraw is boundless. Sketch diagrams, wireframes, or abstract art — pan, zoom, and expand your canvas freely without ever hitting an edge.",
    bullets: [
      "Smooth pan & zoom",
      "Vector-quality lines via Konva",
      "Responsive on all screen sizes",
    ],
    visual: (
      <svg viewBox="0 0 420 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="420" height="260" fill="#0a0a0a" rx="12"/>
        <defs>
          <pattern id="f2g" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.8" fill="white" opacity="0.12"/>
          </pattern>
        </defs>
        <rect width="420" height="260" fill="url(#f2g)"/>
        {/* infinite lines fading out */}
        {[0,1,2,3,4].map(i => (
          <line key={i} x1={i*80} y1="0" x2={i*80+120} y2="260" stroke="white" strokeWidth="0.4" opacity={0.04 + i*0.01}/>
        ))}
        {/* central sketch */}
        <rect x="120" y="70" width="180" height="120" rx="8" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" strokeDasharray="6 4"/>
        <path d="M160 110 Q 180 90 210 110 T 260 100" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
        <path d="M150 150 Q 200 130 250 150" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        {/* zoom controls */}
        <rect x="350" y="110" width="56" height="56" rx="8" fill="white" opacity="0.05"/>
        <text x="378" y="133" fontSize="16" fill="white" opacity="0.4" textAnchor="middle">+</text>
        <line x1="358" y1="138" x2="398" y2="138" stroke="white" strokeWidth="0.5" opacity="0.2"/>
        <text x="378" y="158" fontSize="16" fill="white" opacity="0.4" textAnchor="middle">−</text>
        {/* pan arrows */}
        <g opacity="0.25">
          <path d="M210 20L210 10L205 15 M210 10L215 15" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M210 250L210 240L205 245 M210 240L215 245" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M10 130L20 130L15 125 M20 130L15 135" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M410 130L400 130L405 125 M400 130L405 135" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        </g>
      </svg>
    ),
  },
  {
    id: "rooms",
    icon: "◈",
    tag: "Rooms",
    title: "Room-Based Sessions",
    headline: "One ID. Instant team access.",
    desc: "Every drawing session lives inside a named room. Create one with any ID you choose, or let CollaboDraw generate a random one. Share the URL and your whole team joins — no invites, no accounts.",
    bullets: [
      "Custom or auto-generated room IDs",
      "Shareable direct room URL",
      "Multiple concurrent rooms",
    ],
    visual: (
      <svg viewBox="0 0 420 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="420" height="260" fill="#0a0a0a" rx="12"/>
        {/* room card */}
        <rect x="80" y="55" width="260" height="150" rx="12" fill="white" opacity="0.04" stroke="white" strokeWidth="0.8" strokeOpacity="0.15"/>
        {/* room label */}
        <rect x="100" y="74" width="120" height="20" rx="4" fill="white" opacity="0.06"/>
        <text x="112" y="87" fontSize="9" fill="white" opacity="0.5" fontFamily="monospace">Room ID</text>
        {/* room id value */}
        <rect x="100" y="100" width="220" height="32" rx="6" fill="white" opacity="0.08" stroke="white" strokeWidth="0.5" strokeOpacity="0.2"/>
        <text x="116" y="121" fontSize="13" fill="white" opacity="0.85" fontFamily="monospace" fontWeight="bold">COLLAB-7X2K</text>
        {/* copy icon */}
        <rect x="296" y="108" width="16" height="16" rx="3" fill="none" stroke="white" strokeWidth="1" opacity="0.3"/>
        <rect x="299" y="105" width="16" height="16" rx="3" fill="none" stroke="white" strokeWidth="1" opacity="0.2"/>
        {/* user avatars joining */}
        {[0,1,2].map(i=>(
          <g key={i} transform={`translate(${100 + i*36}, 155)`}>
            <circle r="14" fill="white" opacity="0.08" stroke="white" strokeWidth="0.6" strokeOpacity="0.25"/>
            <text y="4" fontSize="9" fill="white" opacity="0.6" textAnchor="middle" fontFamily="monospace">
              {["RS","AK","MJ"][i]}
            </text>
          </g>
        ))}
        <text x="210" y="163" fontSize="9" fill="white" opacity="0.35" fontFamily="sans-serif">+2 more</text>
        {/* join arrow */}
        <path d="M296 163H340" stroke="white" strokeWidth="1" opacity="0.2" strokeDasharray="3 3"/>
        <path d="M336 159L344 163L336 167" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.35"/>
        <text x="300" y="193" fontSize="8" fill="white" opacity="0.25" textAnchor="middle">Share link to invite</text>
      </svg>
    ),
  },
  {
    id: "persistence",
    icon: "▣",
    tag: "Storage",
    title: "Persistent Drawing",
    headline: "Your work is always there.",
    desc: "CollaboDraw saves drawing data to MongoDB Atlas automatically. Come back to any room tomorrow and every line you drew will still be there. Nothing is ever lost.",
    bullets: [
      "Auto-save to MongoDB Atlas",
      "Full drawing history per room",
      "Resume any session anytime",
    ],
    visual: (
      <svg viewBox="0 0 420 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="420" height="260" fill="#0a0a0a" rx="12"/>
        {/* database icon */}
        <ellipse cx="210" cy="90" rx="60" ry="20" fill="white" opacity="0.07" stroke="white" strokeWidth="1" strokeOpacity="0.2"/>
        <rect x="150" y="90" width="120" height="50" fill="white" opacity="0.04"/>
        <ellipse cx="210" cy="140" rx="60" ry="20" fill="white" opacity="0.07" stroke="white" strokeWidth="1" strokeOpacity="0.2"/>
        <rect x="150" y="140" width="120" height="40" fill="white" opacity="0.03"/>
        <ellipse cx="210" cy="180" rx="60" ry="20" fill="white" opacity="0.06" stroke="white" strokeWidth="1" strokeOpacity="0.15"/>
        {/* save animation */}
        <path d="M210 30L210 70" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" values="0;-14" dur="1.2s" repeatCount="indefinite"/>
        </path>
        <path d="M205 65L210 72L215 65" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        {/* saved label */}
        <rect x="140" y="200" width="140" height="22" rx="6" fill="white" opacity="0.06"/>
        <circle cx="157" cy="211" r="4" fill="#4ade80" opacity="0.7"/>
        <text x="167" y="215" fontSize="8.5" fill="white" opacity="0.55" fontFamily="monospace">Saved to MongoDB Atlas</text>
      </svg>
    ),
  },
  {
    id: "tools",
    icon: "◎",
    tag: "Tools",
    title: "Rich Toolset",
    headline: "The right tool for every idea.",
    desc: "A focused, distraction-free toolbar gives you everything needed to express yourself clearly. Switch between pen and eraser, adjust color and brush size — no menus, no friction.",
    bullets: [
      "8-color palette + custom",
      "Adjustable brush size (2–30px)",
      "Eraser with configurable width",
    ],
    visual: (
      <svg viewBox="0 0 420 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="420" height="260" fill="#0a0a0a" rx="12"/>
        {/* toolbar panel */}
        <rect x="30" y="70" width="52" height="130" rx="10" fill="white" opacity="0.05" stroke="white" strokeWidth="0.6" strokeOpacity="0.15"/>
        {/* tools */}
        {[
          {y:82, label:"✏", active:true},
          {y:112, label:"⬜", active:false},
          {y:142, label:"○", active:false},
          {y:172, label:"✕", active:false},
        ].map(({y,label,active})=>(
          <g key={y}>
            <rect x="38" y={y} width="36" height="26" rx="7" fill={active?"white":"transparent"} opacity={active?0.12:0} stroke="white" strokeWidth="0.5" strokeOpacity={active?0.3:0.1}/>
            <text x="56" y={y+16} fontSize="11" fill="white" opacity={active?0.9:0.35} textAnchor="middle">{label}</text>
          </g>
        ))}
        {/* color swatches */}
        <text x="112" y="88" fontSize="8" fill="white" opacity="0.3" fontFamily="monospace">Color</text>
        {["white","#e5e5e5","#a3a3a3","#525252","#262626","#111"].map((c,i)=>(
          <circle key={i} cx={112+i*28} cy={104} r={i===0?10:8} fill={c} opacity={i===0?1:0.6} stroke="white" strokeWidth={i===0?1.5:0} strokeOpacity="0.4"/>
        ))}
        {/* brush size */}
        <text x="112" y="135" fontSize="8" fill="white" opacity="0.3" fontFamily="monospace">Brush size · 8px</text>
        <rect x="112" y="146" width="200" height="4" rx="2" fill="white" opacity="0.1"/>
        <rect x="112" y="146" width="80" height="4" rx="2" fill="white" opacity="0.5"/>
        <circle cx="192" cy="148" r="7" fill="white" opacity="0.9"/>
        {/* sample strokes with diff widths */}
        <path d="M112 180 Q 180 160 230 175" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.35"/>
        <path d="M112 200 Q 180 180 230 195" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
        <path d="M112 225 Q 180 205 230 220" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.3"/>
      </svg>
    ),
  },
  {
    id: "setup",
    icon: "⟁",
    tag: "Experience",
    title: "Zero Setup",
    headline: "Open a room. Start drawing.",
    desc: "No installation, no email, no onboarding. CollaboDraw opens in your browser, asks for a room ID, and drops you straight into a live canvas. The fastest path from idea to sketch.",
    bullets: [
      "Works in any modern browser",
      "No account or login needed",
      "Shareable in one click",
    ],
    visual: (
      <svg viewBox="0 0 420 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="420" height="260" fill="#0a0a0a" rx="12"/>
        {/* browser bar */}
        <rect x="60" y="50" width="300" height="170" rx="12" fill="white" opacity="0.04" stroke="white" strokeWidth="0.6" strokeOpacity="0.15"/>
        <rect x="60" y="50" width="300" height="32" rx="12" fill="white" opacity="0.04"/>
        <circle cx="78" cy="66" r="5" fill="white" opacity="0.15"/>
        <circle cx="96" cy="66" r="5" fill="white" opacity="0.1"/>
        <circle cx="114" cy="66" r="5" fill="white" opacity="0.07"/>
        {/* url bar */}
        <rect x="130" y="58" width="200" height="16" rx="4" fill="white" opacity="0.07"/>
        <text x="140" y="70" fontSize="8" fill="white" opacity="0.4" fontFamily="monospace">collabodraw.io/room/XZ9</text>
        {/* content area — simple join screen */}
        <text x="210" y="110" fontSize="14" fill="white" opacity="0.7" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">CollaboDraw</text>
        <rect x="135" y="120" width="150" height="26" rx="7" fill="white" opacity="0.07" stroke="white" strokeWidth="0.5" strokeOpacity="0.2"/>
        <text x="210" y="136" fontSize="9" fill="white" opacity="0.35" textAnchor="middle" fontFamily="monospace">Room ID: XZ9F2K</text>
        <rect x="155" y="158" width="110" height="26" rx="7" fill="white" opacity="0.15"/>
        <text x="210" y="175" fontSize="9" fill="white" opacity="0.8" textAnchor="middle" fontFamily="sans-serif" fontWeight="600">Open Room →</text>
        {/* step numbers */}
        {[
          {x:35, y:90,  n:"1", label:"Visit URL"},
          {x:35, y:150, n:"2", label:"Enter ID"},
        ].map(({x,y,n,label})=>(
          <g key={n}>
            <circle cx={x} cy={y} r="10" fill="white" opacity="0.08"/>
            <text x={x} y={y+3.5} fontSize="9" fill="white" opacity="0.5" textAnchor="middle" fontFamily="monospace">{n}</text>
            <text x={x} y={y+20} fontSize="6.5" fill="white" opacity="0.25" textAnchor="middle">{label}</text>
          </g>
        ))}
      </svg>
    ),
  },
];

/* ─────────────────────────────────────────────
   NAV LINKS  (id matches section id)
───────────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Features",    id: "features"    },
  { label: "How it works",id: "how-it-works"},
  { label: "Walkthrough", id: "walkthrough" },
];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function Home() {
  const [roomId, setRoomId]     = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const featureRefs = useRef([]);
  const navigate = useNavigate();

  const handleJoin = () => {
    const id = roomId.trim() || Math.random().toString(36).slice(2, 8).toUpperCase();
    navigate(`/room/${id}`);
  };

  /* Intersection observer — highlight sidebar item as user scrolls feature panels */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = featureRefs.current.indexOf(entry.target);
            if (idx !== -1) setActiveFeature(idx);
          }
        });
      },
      { threshold: 0.5 }
    );
    featureRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased overflow-x-hidden">

      {/* ── ANNOUNCEMENT BANNER ── */}
      <div className="border-b border-white/10 bg-white/5 py-2 text-center text-xs text-white/60 tracking-widest uppercase">
        🎉 CollaboDraw — Built for PCON Hackathon &nbsp;·&nbsp;
        <a href="#" className="underline underline-offset-2 hover:text-white transition-colors">
          View Source on GitHub →
        </a>
      </div>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L6 6L10 10L14 2" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-[15px] tracking-tight">CollaboDraw</span>
          </a>

          {/* Desktop Nav — smooth scroll to section */}
          <ul className="hidden md:flex items-center gap-1 text-sm">
            {NAV_LINKS.map(({ label, id }) => (
              <li key={id}>
                <button
                  onClick={() => scrollTo(id)}
                  className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-150"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleJoin}
              className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-full hover:bg-white/90 active:scale-95 transition-all duration-150 flex items-center gap-1.5"
            >
              Start Drawing
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1.5 5.5H9.5M9.5 5.5L6.5 2.5M9.5 5.5L6.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`block h-px bg-white transition-all duration-300 origin-center ${menuOpen ? "rotate-45 translate-y-[7.5px]" : ""}`}/>
                <span className={`block h-px bg-white transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`}/>
                <span className={`block h-px bg-white transition-all duration-300 origin-center ${menuOpen ? "-rotate-45 -translate-y-[7.5px]" : ""}`}/>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-black px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => { scrollTo(id); setMenuOpen(false); }}
                className="text-left text-sm text-white/60 hover:text-white py-2 transition-colors"
              >
                {label}
              </button>
            ))}
            <div className="border-t border-white/10 mt-2 pt-3">
              <button
                onClick={handleJoin}
                className="w-full text-sm bg-white text-black font-semibold py-2.5 rounded-full"
              >
                Start Drawing →
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative pt-28 pb-0 text-center overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="w-[1200px] h-[600px] rounded-full bg-white/[0.04] blur-[140px] -translate-y-24"/>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 text-xs text-white/55 mb-8 bg-white/5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"/>
          Real-time collaborative whiteboard · No signup
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-[1.02] mb-6 w-full px-6">
          Draw together,<br/>
          <span className="text-white/20">in real time.</span>
        </h1>

        {/* Sub-copy */}
        <p className="text-white/45 text-xl md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed px-6">
          CollaboDraw is the fastest way to sketch, brainstorm, and collaborate visually — share a room, start drawing, see each other live.
        </p>

        {/* CTA Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 px-6">
          <div className="flex items-center gap-2 border border-white/20 rounded-full px-4 py-2.5 bg-white/5 backdrop-blur-sm w-72">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-white/35 shrink-0">
              <rect x="0.5" y="0.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M3.5 6.5H9.5M6.5 3.5V9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Enter a Room ID…"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              className="bg-transparent text-sm text-white placeholder-white/25 outline-none w-full"
            />
          </div>
          <button
            onClick={handleJoin}
            className="bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-white/90 active:scale-95 transition-all duration-150 whitespace-nowrap"
          >
            Open Room →
          </button>
        </div>

        {/* Hero Canvas Preview — FULL WIDTH */}
        <div className="relative w-screen left-1/2 -translate-x-1/2 mt-2">
          <div className="border-t border-l border-r border-white/10 bg-white/[0.02] overflow-hidden rounded-t-2xl mx-4">
            {/* Fake toolbar strip */}
            <div className="border-b border-white/10 px-5 py-3 flex items-center gap-4 bg-white/[0.015]">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white/15"/>
                <span className="w-3 h-3 rounded-full bg-white/15"/>
                <span className="w-3 h-3 rounded-full bg-white/15"/>
              </div>
              <div className="flex-1 flex items-center justify-center gap-4 text-xs">
                <span className="text-white/25">Room:</span>
                <span className="font-mono text-white/55 bg-white/10 px-2.5 py-0.5 rounded-md">COLLAB-42</span>
                <span className="text-white/25">3 users online</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse"/>
              </div>
            </div>

            {/* Canvas drawing area — full width, tall */}
            <div className="relative bg-[#060606] h-[55vh] md:h-[65vh] w-full overflow-hidden">
              {/* Dot-grid */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="dotgrid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <circle cx="16" cy="16" r="0.75" fill="white" opacity="0.08"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotgrid)"/>
              </svg>

              {/* Strokes — wide viewBox stretches across full width */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                {/* Main long stroke */}
                <path d="M 80 340 Q 320 180 560 300 T 1000 265 T 1380 240" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.82">
                  <animate attributeName="stroke-dasharray" from="0 3000" to="3000 0" dur="3s" fill="freeze"/>
                </path>
                {/* Second stroke */}
                <path d="M 160 440 Q 440 340 720 395 T 1160 360 T 1420 345" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.32">
                  <animate attributeName="stroke-dasharray" from="0 3000" to="3000 0" dur="3.5s" begin="0.5s" fill="freeze"/>
                </path>
                {/* Top-right accent */}
                <path d="M 950 155 Q 1060 245 1090 140 T 1260 175" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.48">
                  <animate attributeName="stroke-dasharray" from="0 1000" to="1000 0" dur="2s" begin="0.9s" fill="freeze"/>
                </path>
                {/* Top-left accent */}
                <path d="M 60 195 Q 210 120 360 185 T 580 158" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.28">
                  <animate attributeName="stroke-dasharray" from="0 1000" to="1000 0" dur="2s" begin="1.3s" fill="freeze"/>
                </path>

                {/* User A cursor */}
                <g transform="translate(562,298)">
                  <path d="M0 0L0 17L5 12L8 19L10.5 18L8 11L15 11Z" fill="white" opacity="0.92"/>
                  <rect x="17" y="14" width="70" height="20" rx="5" fill="white" opacity="0.12"/>
                  <text x="23" y="27" fontSize="10" fill="white" opacity="0.85" fontFamily="monospace">Roushan</text>
                </g>

                {/* User B cursor */}
                <g transform="translate(1002,263)">
                  <path d="M0 0L0 17L5 12L8 19L10.5 18L8 11L15 11Z" fill="white" opacity="0.5"/>
                  <rect x="17" y="14" width="48" height="20" rx="5" fill="white" opacity="0.1"/>
                  <text x="23" y="27" fontSize="10" fill="white" opacity="0.6" fontFamily="monospace">Alex</text>
                </g>

                {/* User C cursor */}
                <g transform="translate(360,183)">
                  <path d="M0 0L0 17L5 12L8 19L10.5 18L8 11L15 11Z" fill="white" opacity="0.38"/>
                  <rect x="17" y="14" width="40" height="20" rx="5" fill="white" opacity="0.08"/>
                  <text x="23" y="27" fontSize="10" fill="white" opacity="0.45" fontFamily="monospace">Mia</text>
                </g>

                {/* Pulse ring on cursor A */}
                <circle cx="562" cy="298" r="9" fill="none" stroke="white" strokeWidth="1" opacity="0.3">
                  <animate attributeName="r" values="9;30" dur="1.8s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.35;0" dur="1.8s" repeatCount="indefinite"/>
                </circle>
              </svg>

              {/* Left sidebar tools */}
              <div className="absolute left-5 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                {["✏️","⬜","○","↗","🧹"].map((t, i) => (
                  <div key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm cursor-pointer transition-colors ${i === 0 ? "bg-white/20" : "bg-white/5 hover:bg-white/10 text-white/35"}`}>
                    {t}
                  </div>
                ))}
              </div>

              {/* Bottom fade */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black to-transparent"/>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="pt-10 pb-8 flex flex-col items-center gap-2 text-white/20">
          <span className="text-xs tracking-widest uppercase">Scroll to explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent animate-bounce"/>
        </div>
      </section>

      {/* ── FEATURES — FULL-SCREEN LEFT/RIGHT ALTERNATING ── */}
      <section id="features" className="border-t border-white/10">

        {/* Section header */}
        <div className="py-24 px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-white/30 mb-4">Everything you need</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for real collaboration.</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Every feature is designed to get out of your way and let ideas flow naturally between people.
          </p>
        </div>

        {/* Full-screen rows — alternating text left/right */}
        {FEATURES.map(({ id, icon, tag, title, headline, desc, bullets, visual }, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <div
              key={id}
              id={`feat-${id}`}
              ref={el => featureRefs.current[idx] = el}
              className="w-full flex flex-col md:flex-row border-t border-white/10 relative overflow-hidden"
            >
              {/* Subtle row glow */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className={`w-[500px] h-[500px] rounded-full bg-white/[0.025] blur-[120px] ${isEven ? "-translate-x-1/3" : "translate-x-1/3"}`}/>
              </div>

              {/* TEXT SIDE */}
              <div className={`flex-1 flex flex-col justify-center px-10 md:px-20 py-20 relative z-10 ${isEven ? "md:order-1" : "md:order-2"}`}>
                {/* Step number */}
                <span className="text-7xl font-bold text-white/[0.04] absolute top-12 left-10 md:left-20 select-none leading-none">
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Tag + icon */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs uppercase tracking-widest text-white/30 border border-white/15 rounded-full px-3 py-1">
                    {tag}
                  </span>
                </div>

                {/* Headline */}
                <h3 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
                  {headline}
                </h3>

                {/* Description */}
                <p className="text-white/45 text-lg leading-relaxed max-w-md mb-8">
                  {desc}
                </p>

                {/* Bullet chips */}
                <div className="flex flex-wrap gap-3">
                  {bullets.map(b => (
                    <div
                      key={b}
                      className="flex items-center gap-2 text-sm text-white/55 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L3.5 7L8.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                      </svg>
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              {/* VISUAL SIDE */}
              <div className={`flex-1 flex items-center justify-center p-10 md:p-16 relative z-10 ${isEven ? "md:order-2" : "md:order-1"}`}>
                <div className="w-full max-w-lg aspect-[420/280] rounded-2xl overflow-hidden border border-white/10 bg-[#090909] shadow-2xl shadow-black/60">
                  {visual}
                </div>
              </div>

              {/* Vertical divider line */}
              <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-white/[0.06]"/>
            </div>
          );
        })}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-white/30 mb-4 text-center">How it works</p>
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-20">Three steps. One shared canvas.</h2>

          <div className="grid md:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
            {[
              {
                step: "01",
                title: "Create or Join a Room",
                desc: "Enter any Room ID — or leave it blank and we'll generate one. No signup. No friction.",
                icon: "⬡",
              },
              {
                step: "02",
                title: "Share the Link",
                desc: "Copy your room URL and share it with your team. They join instantly from any browser.",
                icon: "◈",
              },
              {
                step: "03",
                title: "Draw in Real Time",
                desc: "Every stroke is broadcast live. See each other's cursors. Build ideas together.",
                icon: "✦",
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="group bg-black p-8 hover:bg-white/[0.025] transition-colors duration-300">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl text-white/20 font-bold font-mono">{step}</span>
                  <span className="text-xl text-white/30 group-hover:text-white/70 transition-colors">{icon}</span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-3">{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WALKTHROUGH (video-style screenshot row) ── */}
      <section id="walkthrough" className="py-24 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-white/30 mb-4 text-center">Walkthrough</p>
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-6">See it in action.</h2>
          <p className="text-white/40 text-center max-w-md mx-auto mb-16 text-lg">
            A quick tour of what CollaboDraw looks like the moment you join a room.
          </p>

          {/* Three screenshot panels */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                label: "Home screen",
                desc: "Enter or generate a Room ID",
                preview: (
                  <svg viewBox="0 0 280 180" className="w-full h-full">
                    <rect width="280" height="180" fill="#080808"/>
                    <text x="140" y="62" fontSize="12" fill="white" opacity="0.7" textAnchor="middle" fontWeight="bold">🎨 CollaboDraw</text>
                    <rect x="55" y="76" width="170" height="24" rx="6" fill="white" opacity="0.07" stroke="white" strokeWidth="0.5" strokeOpacity="0.2"/>
                    <text x="140" y="92" fontSize="7.5" fill="white" opacity="0.3" textAnchor="middle" fontFamily="monospace">Enter a Room ID…</text>
                    <rect x="75" y="110" width="130" height="24" rx="12" fill="white" opacity="0.15"/>
                    <text x="140" y="126" fontSize="8" fill="white" opacity="0.7" textAnchor="middle" fontWeight="600">Open Room →</text>
                  </svg>
                ),
              },
              {
                label: "Drawing room",
                desc: "Toolbar + live canvas open instantly",
                preview: (
                  <svg viewBox="0 0 280 180" className="w-full h-full">
                    <rect width="280" height="180" fill="#070707"/>
                    <defs>
                      <pattern id="wg" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="0.5" fill="white" opacity="0.1"/>
                      </pattern>
                    </defs>
                    <rect width="280" height="180" fill="url(#wg)"/>
                    <path d="M40 130 Q 100 70 160 110 T 250 90" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
                    <rect x="8" y="50" width="28" height="100" rx="6" fill="white" opacity="0.04"/>
                    {["✏","⬜","○"].map((t,i)=>(<text key={i} x="22" y={68+i*26} fontSize="9" fill="white" opacity="0.4" textAnchor="middle">{t}</text>))}
                  </svg>
                ),
              },
              {
                label: "Live collaboration",
                desc: "See teammates drawing in real time",
                preview: (
                  <svg viewBox="0 0 280 180" className="w-full h-full">
                    <rect width="280" height="180" fill="#070707"/>
                    <path d="M30 120 Q 90 60 150 95 T 260 80" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
                    <path d="M50 150 Q 120 110 200 130" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                    <g transform="translate(150,93)">
                      <path d="M0 0L0 10L2.5 7L4.5 11L6 10.5L4 6.5L8 6.5Z" fill="white" opacity="0.9"/>
                      <rect x="10" y="7" width="38" height="11" rx="3" fill="white" opacity="0.1"/>
                      <text x="13" y="16" fontSize="6" fill="white" opacity="0.7" fontFamily="monospace">Roushan</text>
                    </g>
                    <g transform="translate(200,130)">
                      <path d="M0 0L0 10L2.5 7L4.5 11L6 10.5L4 6.5L8 6.5Z" fill="white" opacity="0.5"/>
                      <rect x="10" y="7" width="28" height="11" rx="3" fill="white" opacity="0.1"/>
                      <text x="13" y="16" fontSize="6" fill="white" opacity="0.5" fontFamily="monospace">Alex</text>
                    </g>
                  </svg>
                ),
              },
            ].map(({ label, desc, preview }) => (
              <div key={label} className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] group hover:border-white/20 transition-colors duration-300">
                <div className="bg-[#090909] aspect-[280/180]">
                  {preview}
                </div>
                <div className="px-4 py-3 border-t border-white/10">
                  <p className="text-sm font-medium text-white/75">{label}</p>
                  <p className="text-xs text-white/35 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 border-t border-white/10 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[700px] h-[350px] rounded-full bg-white/[0.04] blur-[120px]"/>
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Start drawing.<br/>
            <span className="text-white/25">Right now.</span>
          </h2>
          <p className="text-white/40 text-lg mb-10">No account. No install. Just open a room and create.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-2 border border-white/20 rounded-full px-4 py-2.5 bg-white/5 backdrop-blur-sm w-64">
              <input
                type="text"
                placeholder="Room ID (optional)"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleJoin()}
                className="bg-transparent text-sm text-white placeholder-white/25 outline-none w-full"
              />
            </div>
            <button
              onClick={handleJoin}
              className="bg-white text-black text-sm font-semibold px-8 py-2.5 rounded-full hover:bg-white/90 active:scale-95 transition-all duration-150"
            >
              Open Room →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 11L4 5L7.5 7.5L11 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold">CollaboDraw</span>
          </div>
          <div className="flex gap-6 text-xs text-white/25">
            {["GitHub", "Privacy", "Terms", "Contact"].map(item => (
              <a key={item} href="#" className="hover:text-white transition-colors">{item}</a>
            ))}
          </div>
          <p className="text-xs text-white/20">© 2026 CollaboDraw. PCON Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}
