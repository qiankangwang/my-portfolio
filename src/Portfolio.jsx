import { useState, useEffect, useRef, useCallback, lazy, Suspense, memo } from "react";
import D from "./data";
import "./Portfolio.css";

// 3D scene is heavy (three + r3f + postprocessing) — lazy so it doesn't
// gate first paint.
const BgScene3D = lazy(() => import("./BgScene3D"));

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

/* ── Sidebar ──
   The page's constant identity panel. Sticky on the left across the whole
   page (Brittany-Chiang-style), replacing both the old fixed top nav and
   the cinematic hero — name/avatar/tagline live here permanently, so the
   right column is free to play out as a sequence of cinematic scenes.

   - sb-avatar carries the click-to-headpat easter egg (same behaviour as
     the old hero avatar)
   - sb-nav items show an animated rail; the active one extends + brightens
   - sb-foot has contact icons + theme toggle
   - On ≤968px the layout collapses; this becomes a top header in the CSS. */
const Sidebar = memo(function Sidebar({ active, theme, toggleTheme, onAvatarClick, avatarRef, scrollTo }) {
  return (
    <aside className="sidebar">
      <div className="sb-top">
        <button
          type="button"
          className="sb-avatar-btn"
          onClick={onAvatarClick}
          aria-label="Tap the avatar"
        >
          <img
            ref={avatarRef}
            className="sb-avatar"
            src={D.avatar}
            alt={D.name}
            loading="eager"
            decoding="async"
          />
        </button>
        <h1 className="sb-name">{D.fullName}</h1>
        <div className="sb-kicker">UC Berkeley · Data Science · 2027</div>
        <p className="sb-tagline">{D.tagline}</p>
      </div>

      <nav className="sb-nav" aria-label="Section navigation">
        {NAV.map((n, i) => {
          const isActive = active === n;
          return (
            <a
              key={n}
              href={`#${n.toLowerCase()}`}
              className={`sb-nav-item${isActive ? " active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => { e.preventDefault(); scrollTo(n.toLowerCase()); }}
            >
              <span className="sb-nav-rail" aria-hidden="true" />
              <span className="sb-nav-i">{String(i + 1).padStart(2, "0")}</span>
              <span className="sb-nav-label">{n}</span>
            </a>
          );
        })}
      </nav>

      <div className="sb-foot">
        <div className="sb-contacts">
          <a href={`mailto:${D.email}`} aria-label="Email" className="sb-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </a>
          <a href={D.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="sb-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
          <a href={D.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="sb-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
        </div>
        <button className="sb-theme" onClick={toggleTheme} aria-label="Toggle dark mode">
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </aside>
  );
});

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

/* ── Stagger child ──
   IO-triggered cascade: the parent container watches for entry, then each
   child fades + lifts in with a delay = index × 90ms. One-shot, calm. The
   scene's sticky pin is what makes scrolling feel cinematic; the stagger
   itself stays restrained so the page doesn't read as a particle demo. */
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
  const [repos, setRepos] = useState([]);
  const [repoLoading, setRepoLoading] = useState(true);

  // Whole-page scroll progress (0..1) — handed to BgScene3D via ref so the
  // 3D camera can interpolate waypoints inside its own useFrame loop with
  // zero React renders per scroll frame.
  const phaseRef = useRef(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const winH = window.innerHeight;
        const y = window.scrollY;
        setScrolled(y > 40);
        const docH = document.documentElement.scrollHeight - winH;
        const p = docH > 0 ? Math.min(y / docH, 1) : 0;
        setProgress(p);
        phaseRef.current = p;

        // Flip the sidebar nav highlight when a section's pin centres in the
        // viewport. With sections sized at 150svh and pinned for 50svh, this
        // matches the moment the section "takes the stage".
        const sects = NAV.map((n) => document.getElementById(n.toLowerCase()));
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
      {/* Cinematic 3D backdrop — neural network + DNA helix + protein motifs
         in real 3D space, with a scroll-driven director-style camera move.
         Lives fixed behind everything so every section plays out on the
         same continuous stage. */}
      <div className="bgnet" aria-hidden="true">
        <Suspense fallback={null}>
          <BgScene3D phaseRef={phaseRef} />
        </Suspense>
      </div>
      <a className="skip" href="#about">Skip to content</a>

      {/* ── Scroll progress ── */}
      <div className="scroll-progress" aria-hidden="true">
        <div
          className="scroll-progress-bar"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* ── 2-column layout: sticky identity panel + scrolling scenes ── */}
      <div className="layout">
      <Sidebar
        active={active}
        theme={theme}
        toggleTheme={toggleTheme}
        onAvatarClick={onAvatarClick}
        avatarRef={avatarRef}
        scrollTo={scrollTo}
      />

      <main className="main">

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
          <div className="timeline" ref={expRef}>
            {D.experience.map((exp, i) => (
              <StaggerItem key={exp.org} index={i} visible={expVis}>
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
          <div className="skill-bento" ref={skillRef}>
            {Object.entries(D.skills).map(([cat, items], ci) => (
              <StaggerItem key={cat} index={ci} visible={skillVis}>
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

        {/* ── Footer (inside main column so it scrolls with content) ── */}
        <footer className="foot">
          <div className="foot-inner">
            <div className="foot-copy">© {new Date().getFullYear()} {D.fullName} · Built with React</div>
          </div>
        </footer>
      </main>
      </div>{/* /.layout */}

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
