import { useState, useEffect, useRef, useCallback, memo, lazy, Suspense } from "react";
import D from "./data";
import "./Portfolio.css";

// Lazy-load the decorative hero canvas (large, aria-hidden, non-critical)
// so it code-splits out of the initial bundle and the hero text paints
// first. Suspense fallback is null — the background simply appears once
// its chunk loads.
const NeuralNetCanvas = lazy(() => import("./NeuralNetCanvas"));

/* ── DecodeText — left-to-right glitch reveal. Charset mixes Greek +
   math symbols so the scramble passes through ∇ ∂ Σ before resolving,
   reading as model output rather than a Hollywood decryption. */
const DECODE_CHARSET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ∇∂Σλπθϕψξµη∫∑";
function decodeScramble(target) {
  let out = "";
  for (let i = 0; i < target.length; i++) {
    const c = target.charCodeAt(i);
    // Preserve whitespace, hyphens, dots, mid-dots, slashes, brackets.
    if (c <= 32 || c === 0x00B7 || c === 0x2013 || c === 0x2014 ||
        (c >= 0x21 && c <= 0x2F) || (c >= 0x3A && c <= 0x40) ||
        (c >= 0x5B && c <= 0x60) || (c >= 0x7B && c <= 0x7E)) {
      out += target[i];
    } else {
      out += DECODE_CHARSET[Math.floor(Math.random() * DECODE_CHARSET.length)];
    }
  }
  return out;
}
function DecodeText({ text, duration = 720, delay = 0, threshold = 0.25, className, as: Tag = "span", id }) {
  const ref = useRef(null);
  const [out, setOut] = useState(text);
  const startedRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOut(decodeScramble(text));
    const target = String(text);
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        obs.disconnect();
        const startT = performance.now() + delay;
        const tick = (now) => {
          const elapsed = now - startT;
          if (elapsed < 0) {
            setOut(decodeScramble(target));
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          const p = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const settled = Math.floor(eased * target.length);
          setOut(target.slice(0, settled) + decodeScramble(target.slice(settled)));
          if (p < 1) rafRef.current = requestAnimationFrame(tick);
          else setOut(target);
        };
        rafRef.current = requestAnimationFrame(tick);
      },
      { threshold }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, delay, duration, threshold]);

  return <Tag ref={ref} id={id} aria-label={text} className={className}>{out}</Tag>;
}

function useTypewriter(text, speed = 28) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setOut("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { text: out, done };
}

/* ── Atmosphere — full-bleed cinematic canvas + vignette. ── */
const Atmosphere = memo(function Atmosphere({ sceneRef }) {
  return (
    <div className="atmos" aria-hidden="true">
      <Suspense fallback={null}>
        <NeuralNetCanvas sceneRef={sceneRef} />
      </Suspense>
      <div className="atmos-vignette" />
    </div>
  );
});

/* ── SectionWatermark — huge italic-serif scene name behind content. ── */
const SectionWatermark = memo(function SectionWatermark({ active }) {
  const label = active || "Hero";
  return (
    <div className="section-watermark" aria-hidden="true" key={label}>
      {label}
    </div>
  );
});

/* ── Side-rail formation glyphs (one per section's canvas motif). ── */
const NavGlyphHelix = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 2 C7 5, 9 5, 13 2 M3 8 C7 11, 9 11, 13 8 M3 14 C7 11, 9 11, 13 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);
const NavGlyphNetwork = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <g fill="currentColor">
      <circle cx="2" cy="3" r=".9" /><circle cx="2" cy="8" r=".9" /><circle cx="2" cy="13" r=".9" />
      <circle cx="8" cy="2" r=".9" /><circle cx="8" cy="8" r=".9" /><circle cx="8" cy="14" r=".9" />
      <circle cx="14" cy="3" r=".9" /><circle cx="14" cy="8" r=".9" /><circle cx="14" cy="13" r=".9" />
    </g>
    <g stroke="currentColor" strokeWidth=".4" opacity=".55">
      <line x1="2" y1="3" x2="8" y2="2" /><line x1="2" y1="3" x2="8" y2="8" />
      <line x1="2" y1="8" x2="8" y2="8" /><line x1="2" y1="13" x2="8" y2="14" />
      <line x1="2" y1="13" x2="8" y2="8" />
      <line x1="8" y1="2" x2="14" y2="3" /><line x1="8" y1="8" x2="14" y2="8" />
      <line x1="8" y1="8" x2="14" y2="3" /><line x1="8" y1="14" x2="14" y2="13" />
      <line x1="8" y1="8" x2="14" y2="13" />
    </g>
  </svg>
);
const NavGlyphSphere = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <ellipse cx="8" cy="8" rx="6" ry="2.4" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".55" />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
  </svg>
);
const NavGlyphGrid = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <g fill="currentColor">
      <rect x="2"  y="2"  width="2.6" height="2.6" />
      <rect x="6.7" y="2"  width="2.6" height="2.6" />
      <rect x="11.4" y="2"  width="2.6" height="2.6" />
      <rect x="2"  y="6.7" width="2.6" height="2.6" />
      <rect x="11.4" y="6.7" width="2.6" height="2.6" />
      <rect x="2"  y="11.4" width="2.6" height="2.6" />
      <rect x="6.7" y="11.4" width="2.6" height="2.6" />
      <rect x="11.4" y="11.4" width="2.6" height="2.6" />
    </g>
  </svg>
);
const NavGlyphRings = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="8" cy="8" r="2" />
      <circle cx="8" cy="8" r="4.2" opacity=".75" />
      <circle cx="8" cy="8" r="6.4" opacity=".5" />
    </g>
  </svg>
);
const NAV_GLYPHS = {
  About:       NavGlyphHelix,
  Research:    NavGlyphNetwork,
  Publication: NavGlyphSphere,
  Projects:    NavGlyphGrid,
  Skills:      NavGlyphRings,
};

const SideRail = memo(function SideRail({ active, scrollTo, visible }) {
  const activeIdx = NAV.indexOf(active);
  return (
    <nav
      className={`side-rail${visible ? " visible" : ""}`}
      aria-label="Section navigation"
    >
      {NAV.map((n, i) => {
        const isActive = active === n;
        const isPassed = activeIdx >= 0 && i < activeIdx;
        const Glyph = NAV_GLYPHS[n];
        const classes = [
          "sb-nav-item",
          isActive ? "active" : "",
          isPassed ? "passed" : "",
        ].filter(Boolean).join(" ");
        return (
          <a
            key={n}
            href={`#${n.toLowerCase()}`}
            className={classes}
            aria-current={isActive ? "page" : undefined}
            onClick={(e) => { e.preventDefault(); scrollTo(n.toLowerCase()); }}
          >
            <span className="sb-nav-rail" aria-hidden="true" />
            <span className="sb-nav-i">{String(i + 1).padStart(2, "0")}</span>
            {Glyph ? <Glyph /> : null}
            <span className="sb-nav-label">{n}</span>
          </a>
        );
      })}
    </nav>
  );
});

/* ── CursorSpot — soft warm halo drifting under the cursor. ── */
const CursorSpot = memo(function CursorSpot() {
  const ref = useRef(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;
    let raf = 0;
    let tx = -9999, ty = -9999;
    let x = -9999, y = -9999;
    let seen = false;
    const tick = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      const el = ref.current;
      if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      // Settle: once the halo has caught the cursor, stop scheduling — a new
      // mousemove restarts it. Avoids a forever-running idle rAF.
      if (Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        x = tx;
        y = ty;
        seen = true;
      }
      if (!raf) raf = requestAnimationFrame(tick); // restart if idle
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  return <div ref={ref} className="cursor-spot" aria-hidden="true" />;
});

// Per-section accent — mirrors the CSS [data-pos] palette so body-
// level chrome (edge glow) can tint with the active scene.
const SCENE_HUES = [
  { a: "#1E3A8A" }, // Hero (root)
  { a: "#1E3A8A" }, // About
  { a: "#1E40AF" }, // Research
  { a: "#2A3D7A" }, // Publication
  { a: "#4338CA" }, // Projects
  { a: "#1F3D8E" }, // Skills
];

const CornerControls = memo(function CornerControls() {
  return (
    <div className="corner-controls">
      <div className="sb-contacts">
        <a href={`mailto:${D.email}`} aria-label="Email" className="sb-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </a>
        <a href={D.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="sb-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </a>
        <a href={D.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="sb-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
      </div>
    </div>
  );
});

function useInView(threshold = 0.12, once = true) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);
  return [ref, visible];
}

const Section = memo(function Section({ id, pos, children, className = "", ...rest }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      id={id}
      data-pos={pos}
      className={`sect${vis ? " in" : ""} ${className}`}
      {...rest}
    >
      <div className="sect-pin">
        <div className="sect-stage">
          {children}
        </div>
      </div>
    </section>
  );
});

const StaggerItem = memo(function StaggerItem({ children, index, visible }) {
  return (
    <div
      className={`stag-item${visible ? " in" : ""}`}
      style={{ "--stag-i": index }}
    >
      {children}
    </div>
  );
});

const CountUp = memo(function CountUp({ target, suffix = "", duration = 2000 }) {
  const [ref, visible] = useInView(0.5);
  const raf = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [visible, target, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
});

const HeroScene = memo(function HeroScene({ onAvatarClick, avatarRef, scrolled }) {
  const tagline = useTypewriter(D.tagline);
  return (
    <section id="hero" className="hero-scene">
      <button
        type="button"
        className="hero-avatar-btn sb-avatar-btn"
        onClick={onAvatarClick}
        aria-label="Tap the avatar"
      >
        <img
          ref={avatarRef}
          className="hero-avatar sb-avatar"
          src={D.avatar}
          alt={D.name}
          loading="eager"
          decoding="async"
        />
      </button>
      <DecodeText className="hero-kicker" text="Qiankang (Kant) Wang · 2026" duration={820} delay={140} />
      <h1 className="hero-name">
        <span className="hero-name-word">Qiankang</span>{" "}
        <span className="hero-name-word">(Kant)</span>{" "}
        <span className="hero-name-word">Wang.</span>
      </h1>
      <p className="hero-tagline" aria-label={D.tagline}>
        <span aria-hidden="true">{tagline.text}</span>
        <span
          className={`sb-caret${tagline.done ? " sb-caret-done" : ""}`}
          aria-hidden="true"
        />
      </p>
      <div className="hero-meta">
        <span>UC Berkeley</span>
        <span className="hero-meta-dot" aria-hidden="true">·</span>
        <span>Data Science · 2027</span>
      </div>
      <a
        href="#about"
        className={`hero-cue${scrolled ? " hero-cue-fade" : ""}`}
        aria-label="Scroll to about"
      >
        <span>Scroll</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <polyline points="19 12 12 19 5 12"/>
        </svg>
      </a>
    </section>
  );
});

// SCENE_IDS drives the canvas camera path; NAV is the rail order (hero
// is the implicit entry, not a clickable rail item).
const SCENE_IDS = ["hero", "about", "research", "publication", "projects", "skills"];
const NAV = ["About", "Research", "Publication", "Projects", "Skills"];

const LANG_COLORS = {
  JavaScript: "#F1E05A",
  TypeScript: "#3178C6",
  Python:     "#3572A5",
  Jupyter:    "#DA5B0B",
  "Jupyter Notebook": "#DA5B0B",
  Java:       "#B07219",
  HTML:       "#E34C26",
  CSS:        "#563D7C",
  Go:         "#00ADD8",
  Rust:       "#DEA584",
  Swift:      "#FFAC45",
  "C++":      "#F34B7D",
  C:          "#555555",
  Ruby:       "#701516",
  PHP:        "#4F5D95",
  Shell:      "#89E051",
  R:          "#198CE7",
  MATLAB:     "#E16737",
  Kotlin:     "#A97BFF",
  Scala:      "#C22D40",
  Lua:        "#000080",
  Vue:        "#41B883",
  Svelte:     "#FF3E00",
  Dart:       "#00B4AB",
  Julia:      "#A270BA",
  Haskell:    "#5E5086",
};

export default function Portfolio() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");
  const [repos, setRepos] = useState([]);
  const [repoLoading, setRepoLoading] = useState(false);
  // Continuous scroll-position scene index [0, SCENE_IDS.length-1] →
  // NeuralNetCanvas camera. Ref instead of state so we don't re-render
  // per frame.
  const sceneRef = useRef(0);

  useEffect(() => {
    // Cache DOM refs once — these elements live for the lifetime of the
    // page, so re-querying them on every scroll frame is pure overhead.
    const sceneEls = SCENE_IDS.map((id) => document.getElementById(id));
    const navEls = NAV.map((n) => document.getElementById(n.toLowerCase()));

    let ticking = false;
    // Last-emitted values so we can skip redundant setStates (each one
    // is a Portfolio re-render — memo'd children no-op, but the parent
    // still reconciles).
    let lastScrolled = null;
    let lastActive = null;
    let lastProgress = -1;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const winH = window.innerHeight;
        const y = window.scrollY;

        const nextScrolled = y > 40;
        if (nextScrolled !== lastScrolled) {
          lastScrolled = nextScrolled;
          setScrolled(nextScrolled);
        }

        const docH = document.documentElement.scrollHeight - winH;
        const p = docH > 0 ? Math.min(y / docH, 1) : 0;
        // Progress bar updates are visually indistinguishable below
        // ~0.1% — gate to keep React out of the hot path on slow drags.
        if (Math.abs(p - lastProgress) > 0.001) {
          lastProgress = p;
          setProgress(p);
        }

        const viewCentre = y + winH * 0.5;
        const centres = sceneEls.map((s) => {
          if (!s) return null;
          const rect = s.getBoundingClientRect();
          return rect.top + y + rect.height * 0.5;
        });
        let scene = 0;
        if (centres[0] != null && viewCentre <= centres[0]) {
          scene = 0;
        } else if (centres[centres.length - 1] != null && viewCentre >= centres[centres.length - 1]) {
          scene = centres.length - 1;
        } else {
          for (let i = 0; i < centres.length - 1; i++) {
            const a = centres[i];
            const b = centres[i + 1];
            if (a != null && b != null && viewCentre >= a && viewCentre < b) {
              scene = i + (viewCentre - a) / (b - a);
              break;
            }
          }
        }
        sceneRef.current = scene;

        const flipAt = winH * 0.4;
        let nextActive = "";
        for (let i = navEls.length - 1; i >= 0; i--) {
          if (navEls[i] && navEls[i].getBoundingClientRect().top < flipAt) {
            nextActive = NAV[i];
            break;
          }
        }
        if (nextActive !== lastActive) {
          lastActive = nextActive;
          setActive(nextActive);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const CACHE_KEY = "gh-repos-v2";
    const TTL_MS = 60 * 60 * 1000;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Array.isArray(data) && data.length && Date.now() - ts < TTL_MS) {
          setRepos(data);
          setRepoLoading(false);
          return;
        }
      }
    } catch { /* corrupt cache — fall through and refetch */ }
    fetch("https://api.github.com/users/qiankangwang/repos?sort=updated&per_page=18")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data)
          ? data
              .filter((r) => !r.fork && r.name !== "my-portfolio")
              .slice(0, 6)
              .map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                language: r.language,
                stargazers_count: r.stargazers_count,
                html_url: r.html_url,
              }))
          : [];
        setRepos(list);
        setRepoLoading(false);
        if (list.length) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list }));
          } catch { /* quota — ignore */ }
        }
      })
      .catch(() => setRepoLoading(false));
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const idx = active ? NAV.indexOf(active) + 1 : 0;
    const hue = SCENE_HUES[Math.max(0, Math.min(5, idx))].a;
    document.body.style.setProperty("--scene-accent", hue);
  }, [active]);

  useEffect(() => {
    const base = "Qiankang (Kant) Wang · Personal Website";
    document.title = active ? `${active} · Qiankang (Kant) Wang` : base;
    return () => { document.title = base; };
  }, [active]);

  const [expRef, expVis] = useInView(0.15);
  const [skillRef, skillVis] = useInView(0.15);

  const patTimer = useRef(null);
  const patCountRef = useRef(0);
  const avatarRef = useRef(null);

  const onAvatarClick = useCallback(() => {
    const nextCount = Math.min(patCountRef.current + 1, 8);
    patCountRef.current = nextCount;
    if (patTimer.current) clearTimeout(patTimer.current);
    patTimer.current = setTimeout(() => {
      patCountRef.current = 0;
    }, 1500);

    const el = avatarRef.current;
    if (!el) return;
    // Web Animations API isn't covered by the global CSS reduced-motion
    // reset, so guard it explicitly.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const s = Math.min(0.55 + nextCount * 0.05, 0.88);
    const t = Math.min(6 + nextCount * 2, 22);
    el.animate(
      [
        { transform: "scale(1) translateY(0)" },
        { transform: `scale(1.06, ${s}) translateY(${t}px)`, offset: 0.4 },
        { transform: "scale(1) translateY(0)" },
      ],
      { duration: 380, easing: "cubic-bezier(.22, 1, .36, 1)" }
    );
  }, []);

  return (
    <>
      <a className="skip" href="#main-content">Skip to content</a>

      <div className="scroll-progress" aria-hidden="true">
        <div
          className="scroll-progress-bar"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <Atmosphere sceneRef={sceneRef} />
      <div className="edge-glow" aria-hidden="true" />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {active ? `Now viewing: ${active}` : "Now viewing: Introduction"}
      </div>
      <CursorSpot />
      <SectionWatermark active={active} />
      <SideRail active={active} scrollTo={scrollTo} visible={scrolled} />
      <CornerControls />

      <main id="main-content" className="main" tabIndex={-1}>
        <HeroScene onAvatarClick={onAvatarClick} avatarRef={avatarRef} scrolled={scrolled} />

        <Section id="about" pos="tr" aria-labelledby="about-title">
          <div className="sect-meta">
            <a href="#about" className="sect-n">01 · About</a>
          </div>
          <DecodeText as="h2" id="about-title" className="sect-title decode-title" text="About me." duration={620} delay={120} />
          <p className="about-lede">{D.about}</p>
          <div className="about-stats-row">
            {D.stats.map((s) => (
              <div key={s.l} className="stat-inline">
                <span className="stat-n">{s.n}</span>
                <span className="stat-l">{s.l}</span>
              </div>
            ))}
            <div className="stat-inline">
              <span className="stat-n"><CountUp target={new Date().getFullYear() - 2024} suffix="+" /></span>
              <span className="stat-l">Years researching</span>
            </div>
          </div>
          <ul className="focus-list">
            {D.focuses.map((f) => (
              <li key={f} className="focus-item">{f}</li>
            ))}
          </ul>
        </Section>

        <Section id="research" pos="mr" aria-labelledby="research-title">
          <div className="sect-meta">
            <a href="#research" className="sect-n">02 · Research</a>
          </div>
          <DecodeText as="h2" id="research-title" className="sect-title decode-title" text="Research experience." duration={620} delay={120} />
          <ol className="exp-list" ref={expRef}>
            {D.experience.map((exp, i) => {
              const startYear = exp.period.match(/(\d{4})/)?.[1] ?? "—";
              return (
                <StaggerItem key={exp.org} index={i} visible={expVis}>
                  <li className="exp-row">
                    <time className="exp-year">{startYear}</time>
                    <div className="exp-body">
                      <div className="exp-role">{exp.role}</div>
                      <div className="exp-org">{exp.org}</div>
                      <div className="exp-period">{exp.period}</div>
                      {exp.desc && <p className="exp-desc">{exp.desc}</p>}
                      {exp.tag && <span className="exp-tag">{exp.tag}</span>}
                    </div>
                  </li>
                </StaggerItem>
              );
            })}
          </ol>
        </Section>

        <Section id="publication" pos="bl" aria-labelledby="publication-title">
          <div className="sect-meta">
            <a href="#publication" className="sect-n">03 · Publication</a>
            <span className="sect-meta-aux">{D.publication.venue} · {D.publication.year}</span>
          </div>
          <DecodeText as="h2" id="publication-title" className="sect-title decode-title" text="Selected publication." duration={620} delay={120} />
          <a
            href={D.publication.links[0]?.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="pub-link"
          >
            <h3 className="pub-title">{D.publication.title}</h3>
            <p className="pub-authors">
              {D.publication.authors} · <em>{D.publication.role}</em>
            </p>
            <span className="pub-cta">
              Read paper
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
          </a>
        </Section>

        <Section id="projects" pos="br" aria-labelledby="projects-title">
          <div className="sect-meta">
            <a href="#projects" className="sect-n">04 · Projects</a>
          </div>
          <DecodeText as="h2" id="projects-title" className="sect-title decode-title" text="Selected projects." duration={620} delay={120} />
          {repoLoading ? (
            <div className="projects-loading">
              <div className="spinner" />
              <span>Loading repositories…</span>
            </div>
          ) : (
            <ul className="proj-list">
              {(repos.length > 0 ? repos : D.projects).map((repo, i) => (
                <li key={repo.id || repo.name} className="proj-row" style={{ "--stag-i": i }}>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proj-link"
                  >
                    <span className="proj-name">{repo.name}</span>
                    <span className="proj-desc">{repo.description || "No description provided."}</span>
                    <span className="proj-meta">
                      <span className="proj-lang">
                        {repo.language && (
                          <span
                            className="proj-lang-dot"
                            style={{ background: LANG_COLORS[repo.language] || "var(--fg4)" }}
                            aria-hidden="true"
                          />
                        )}
                        {repo.language || "—"}
                      </span>
                      {repo.stargazers_count > 0 && (
                        <span className="proj-stars">★ {repo.stargazers_count}</span>
                      )}
                      <span className="proj-arrow" aria-hidden="true">→</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="skills" pos="tl" aria-labelledby="skills-title">
          <div className="sect-meta">
            <a href="#skills" className="sect-n">05 · Skills</a>
          </div>
          <DecodeText as="h2" id="skills-title" className="sect-title decode-title" text="Skills & tools." duration={620} delay={120} />
          <div className="skill-groups" ref={skillRef}>
            {Object.entries(D.skills).map(([cat, items], ci) => (
              <StaggerItem key={cat} index={ci} visible={skillVis}>
                <div className="skill-group">
                  <div className="skill-cat">{cat}</div>
                  <ul className="skill-pills">
                    {items.map((s) => (
                      <li key={s} className="pill">{s}</li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </div>
        </Section>

        <footer className="foot">
          <div className="foot-inner">
            <div className="foot-copy">© {new Date().getFullYear()} {D.fullName} · Built with React</div>
          </div>
        </footer>
      </main>

    </>
  );
}
