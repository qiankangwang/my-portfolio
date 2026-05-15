import { useState, useEffect, useRef, useCallback, lazy, Suspense, memo } from "react";
import D from "./data";
import "./Portfolio.css";

const NeuralNetCanvas = lazy(() => import("./NeuralNetCanvas"));

/* ── Ambient background orbs ── */
function AmbientBg() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="amb-orb amb-1" />
      <div className="amb-orb amb-2" />
      <div className="amb-orb amb-3" />
    </div>
  );
}

/* ── Central 3D anchor ──
   A persistent visual element pinned at the viewport's geometric centre.
   Stays there for the whole page so the viewer's eye has a constant focus
   point; every section's content unfolds *around* it. The core breathes,
   three orbital rings spin at tilted axes (CSS 3D), and overall scale/glow
   intensify with --page-p (overall scroll). It fades in as the hero pin
   releases so the hero canvas owns the intro alone. */
function CentralAnchor() {
  return (
    <div className="anchor" aria-hidden="true">
      <div className="anchor-aura" />
      <div className="anchor-ring anchor-ring-1" />
      <div className="anchor-ring anchor-ring-2" />
      <div className="anchor-ring anchor-ring-3" />
      <div className="anchor-core" />
    </div>
  );
}

/* ── Intersection Observer hook ── */
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

/* ── Section ──
   Each section is a tall scroll container (.sect, 150svh) whose inner stage
   (.sect-pin) is sticky-pinned to the viewport. While the user scrolls
   through the section's range, the visible content stays locked at the
   viewport's vertical center — that pinned midpoint is the "central anchor"
   the viewer's eye rests on. Internal content (headings, cards) reveals
   inside the anchor; the scroll only advances progress, it doesn't move
   focus. .in toggles a one-shot fly-in just before the pin engages so the
   stage lands cleanly. */
const Section = memo(function Section({ id, children, className = "", ...rest }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // rootMargin shrinks the trigger zone to the upper half of the viewport,
    // so .in fires when the section is just about to take the pinned position.
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -45% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      id={id}
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

/* ── Stagger child ── carries an index as --stag-i; the reveal itself is
   driven by --sect-p in CSS, so items cascade in lockstep with the section's
   scroll progress rather than firing once on an IO trigger. */
const StaggerItem = memo(function StaggerItem({ children, index }) {
  return (
    <div className="stag-item" style={{ "--stag-i": index }}>
      {children}
    </div>
  );
});

/* ── Word-by-word text reveal ── */
const TextReveal = memo(function TextReveal({ text, tag: Tag = "h1", className }) {
  const [ref, vis] = useInView(0.3);
  const words = text.split(" ");
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="word-wrap"
        >
          <span
            className="word-inner"
            style={{
              transform: vis ? "translateY(0)" : "translateY(110%)",
              transition: `transform 0.65s ${0.04 * i}s cubic-bezier(.22,1,.36,1)`,
            }}
          >
            {w}
          </span>
        </span>
      ))}
    </Tag>
  );
});

/* ── Animated counter ── */
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

/* ── Typewriter effect ── */
const TypeWriter = memo(function TypeWriter({ text, speed = 40, start = false }) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!start) return;
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplay(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, start]);

  return (
    <span className="typewriter">
      {display}
      {!done && <span className="type-cursor">|</span>}
    </span>
  );
});

/* ── Dark mode hook ── */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return [theme, toggle];
}

/* ── 3D Tilt card hook (rAF + direct DOM writes; no re-renders on mousemove) ── */
function useTilt(intensity = 8) {
  const ref = useRef(null);
  const raf = useRef(0);
  const target = useRef({ rx: 0, ry: 0 });

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    target.current.ry = ((e.clientX - rect.left) / rect.width - 0.5) * intensity;
    target.current.rx = ((e.clientY - rect.top) / rect.height - 0.5) * -intensity;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el2 = ref.current;
      if (!el2) return;
      const { rx, ry } = target.current;
      el2.style.transition = "transform 0.15s ease-out";
      el2.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.01,1.01,1.01)`;
    });
  }, [intensity]);

  const onLeave = useCallback(() => {
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.4s cubic-bezier(.22,1,.36,1)";
    el.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)";
  }, []);

  return [ref, onMove, onLeave];
}

/* ── Tilt card wrapper ── */
const TiltCard = memo(function TiltCard({ children, className = "" }) {
  const [ref, onMove, onLeave] = useTilt(6);
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
});

/* ── Main ── */
const NAV = ["About", "Research", "Publication", "Projects", "Skills"];

export default function Portfolio() {
  const [theme, toggleTheme] = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroVis, setHeroVis] = useState(false);
  const [repos, setRepos] = useState([]);
  const [repoLoading, setRepoLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const winH = window.innerHeight;
        const y = window.scrollY;
        setScrolled(y > 40);
        const docH = root.scrollHeight - winH;
        const pageP = docH > 0 ? Math.min(y / docH, 1) : 0;
        setProgress(pageP);
        root.style.setProperty("--page-p", pageP);

        // Hero parallax — written directly to a CSS var to skip React renders.
        const heroP = Math.min(Math.max(y / winH, 0), 1);
        root.style.setProperty("--hero-p", heroP);

        // Per-section scroll progress (--sect-p). Spans the whole window where
        // the section is even partly relevant: 0 when it's about to enter from
        // below, 1 when it's fully exited above. CSS uses this to stagger
        // section content reveals across the pin range. Apple/Linear-style
        // scrollytelling without GSAP.
        const sects = NAV.map((n) => document.getElementById(n.toLowerCase()));
        for (let i = 0; i < sects.length; i++) {
          const el = sects[i];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const range = el.offsetHeight + winH;
          const scrolled = winH - rect.top;
          const p = Math.min(Math.max(scrolled / range, 0), 1);
          el.style.setProperty("--sect-p", p);
        }

        // Flip the nav highlight when a section's pin is roughly centered.
        const flipAt = winH * 0.4;
        for (let i = sects.length - 1; i >= 0; i--) {
          if (sects[i] && sects[i].getBoundingClientRect().top < flipAt) {
            setActive(NAV[i]);
            ticking = false;
            return;
          }
        }
        setActive("");
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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
    fetch("https://api.github.com/users/xiaole5211314/repos?sort=updated&per_page=18")
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
    setMenuOpen(false);
  }, []);

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
      <AmbientBg />
      <CentralAnchor />
      <a className="skip" href="#about">Skip to content</a>

      {/* ── Scroll progress ── */}
      <div className="scroll-progress" aria-hidden="true">
        <div
          className="scroll-progress-bar"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* ── Nav ── */}
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <button
          className="nav-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
        >
          <img src={`${process.env.PUBLIC_URL}/photo.png`} alt="" className="nav-logo-img" />
        </button>
        <div className="nav-right">
          <div className={`nav-links${menuOpen ? " open" : ""}`}>
            {NAV.map((n) => (
              <a
                key={n}
                href={`#${n.toLowerCase()}`}
                className={active === n ? "active" : ""}
                aria-current={active === n ? "page" : undefined}
                onClick={(e) => { e.preventDefault(); scrollTo(n.toLowerCase()); }}
              >
                {n}
              </a>
            ))}
          </div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
          </button>
        </div>
      </nav>

      {/* ── Hero (cinematic pin) ──
         .hero-scroll provides the scroll distance; .hero pins to the viewport
         and morphs in place via --hero-p. Reads like a camera push-in instead
         of a vertical scroll. */}
      <section className="hero-scroll" aria-label="Introduction">
      <header className="hero">
        <Suspense fallback={<div className="canvas-placeholder" />}>
          <NeuralNetCanvas />
        </Suspense>
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className={`hero-badge${heroVis ? " vis" : ""}`}>
            <span className="hero-badge-dot" />
            Available for Research
          </div>
          <div className="hero-avatar-wrap">
            <img
              ref={avatarRef}
              className={`hero-avatar${heroVis ? " vis" : ""}`}
              src={D.avatar}
              alt={D.name}
              loading="eager"
              decoding="async"
              onClick={onAvatarClick}
              title="Click me!"
            />
          </div>
          <div className={`hero-kicker${heroVis ? " vis" : ""}`}>
            UC Berkeley · Data Science · 2027
          </div>
          <TextReveal text={D.fullName} tag="h1" className="gradient-text" />
          <div className={`hero-rule${heroVis ? " vis" : ""}`} />
          <p className={`hero-tagline${heroVis ? " vis" : ""}`}>
            <TypeWriter text={D.tagline} start={heroVis} speed={28} />
          </p>
          <div className={`hero-focuses${heroVis ? " vis" : ""}`}>
            {D.focuses.map((f) => <span key={f} className="focus-tag">{f}</span>)}
          </div>
          <div className={`hero-cta${heroVis ? " vis" : ""}`}>
            <a className="btn primary" href={`mailto:${D.email}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email
            </a>
            <a className="btn" href={D.github} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>
            <a className="btn" href={D.linkedin} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
          </div>
        </div>
        <div className="scroll-hint">
          <div className="scroll-mouse">
            <div className="scroll-wheel" />
          </div>
          <span>Scroll to explore</span>
        </div>
      </header>
      </section>

      <main className="content">

        {/* ── About ── */}
        <Section id="about" data-n="01">
          <div className="section-head">
            <span className="sect-n">01</span>
            <h2>About</h2>
          </div>
          <div className="about-layout">
            <div className="about-stats">
              {D.stats.map((s) => (
                <div key={s.l} className="stat">
                  <span className="stat-n">{s.n}</span>
                  <span className="stat-l">{s.l}</span>
                </div>
              ))}
              <div className="stat">
                <span className="stat-n"><CountUp target={new Date().getFullYear() - 2024} suffix="+" /></span>
                <span className="stat-l">Years in Research</span>
              </div>
            </div>
            <div className="about-text-wrap">
              <p className="about-text">{D.about}</p>
              <div className="about-highlights">
                <div className="about-highlight">
                  <div className="about-hl-icon">🧬</div>
                  <div className="about-hl-text">
                    <strong>AI for Biology</strong>
                    <span>Applying ML to biophysics & molecular simulation</span>
                  </div>
                </div>
                <div className="about-highlight">
                  <div className="about-hl-icon">⚡</div>
                  <div className="about-hl-text">
                    <strong>Scientific Computing</strong>
                    <span>GPU acceleration & high-performance workflows</span>
                  </div>
                </div>
                <div className="about-highlight">
                  <div className="about-hl-icon">🔬</div>
                  <div className="about-hl-text">
                    <strong>Research</strong>
                    <span>Self-supervised learning & representation learning</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Research ── */}
        <Section id="research" delay={0.05} data-n="02">
          <div className="section-head">
            <span className="sect-n">02</span>
            <h2>Research</h2>
          </div>
          <div className="timeline">
            {D.experience.map((exp, i) => (
              <StaggerItem key={exp.org} index={i}>
                <TiltCard className="tl-card-wrap">
                  <div className="tl-item">
                    <div className="tl-rail">
                      <div className="tl-dot" />
                    </div>
                    <div className="tl-card">
                      <div className="tl-top">
                        <span className="tl-tag">{exp.tag}</span>
                        <time className="tl-period">{exp.period}</time>
                      </div>
                      <h3 className="tl-role">{exp.role}</h3>
                      <div className="tl-org">{exp.org}</div>
                      <p className="tl-desc">{exp.desc}</p>
                    </div>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </div>
        </Section>

        {/* ── Publication ── */}
        <Section id="publication" delay={0.05} data-n="03">
          <div className="section-head">
            <span className="sect-n">03</span>
            <h2>Publication</h2>
          </div>
          <TiltCard className="pub-card-wrap">
            <a
              href={D.publication.links[0]?.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="pub-card"
            >
              <div className="pub-venue">
                <span>{D.publication.venue}</span>
                <strong>{D.publication.year}</strong>
              </div>
              <h3>{D.publication.title}</h3>
              <p className="pub-authors">
                {D.publication.authors} <em>· {D.publication.role}</em>
              </p>
              <div className="pub-cta">
                <span className="pub-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Read Paper
                </span>
              </div>
            </a>
          </TiltCard>
        </Section>

        {/* ── Projects ── */}
        <Section id="projects" delay={0.05} data-n="04">
          <div className="section-head">
            <span className="sect-n">04</span>
            <h2>Projects</h2>
          </div>
          {repoLoading ? (
            <div className="projects-loading">
              <div className="spinner" />
              <span>Loading repositories…</span>
            </div>
          ) : (
            <div className="projects-grid">
              {(repos.length > 0 ? repos : D.projects).map((repo, i) => (
                <a
                  key={repo.id || repo.name}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-card"
                  style={{
                    opacity: 1,
                    animation: `fadeUp 0.6s ${0.08 * i}s cubic-bezier(.22,1,.36,1) forwards`,
                  }}
                >
                  <div className="project-card-top">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="project-icon"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                    <span className="project-lang">{repo.language}</span>
                  </div>
                  <h3>{repo.name}</h3>
                  <p>{repo.description || "No description provided."}</p>
                  <div className="project-meta">
                    <span className="project-stars">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {repo.stargazers_count}
                    </span>
                    <span className="project-arrow">→</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Section>

        {/* ── Skills ── */}
        <Section id="skills" delay={0.05} data-n="05">
          <div className="section-head">
            <span className="sect-n">05</span>
            <h2>Skills</h2>
          </div>
          <div className="skill-bento">
            {Object.entries(D.skills).map(([cat, items], ci) => (
              <StaggerItem key={cat} index={ci}>
                <TiltCard className="skill-card-wrap">
                  <article className={`skill-card${ci < 2 ? " featured" : ""}`}>
                    <div className="skill-cat">{cat}</div>
                    <div className="skill-pills">
                      {items.map((s) => (
                        <span key={s} className="pill">{s}</span>
                      ))}
                    </div>
                  </article>
                </TiltCard>
              </StaggerItem>
            ))}
          </div>
        </Section>

      </main>

      {/* ── Footer ── */}
      <footer className="foot">
        <div className="foot-inner">
          <div className="foot-brand">Kant W.</div>
          <div className="foot-links">
            <a href={`mailto:${D.email}`}>Email</a>
            <a href={D.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href={D.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
          <div className="foot-copy">© {new Date().getFullYear()} {D.fullName} · Built with React</div>
        </div>
      </footer>

      <button
        className={`btt${scrolled ? " show" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
    </>
  );
}
