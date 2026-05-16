import { useState, useEffect, useRef, useCallback, memo } from "react";
import D from "./data";
import NeuralNetCanvas from "./NeuralNetCanvas";
import "./Portfolio.css";

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
// Typewriter — character-by-character reveal at 28ms / char (the speed
// the user previously dialled in and likes). Cursor blinks while typing
// and disappears once the full string is on screen.
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

/* ── Atmosphere ──
   Full-bleed fixed neural-network canvas sitting behind everything.
   The network is the page's continuous atmosphere — content scrolls
   on top of it; the camera repositions per scene without ever splitting
   off into its own pane. */
const Atmosphere = memo(function Atmosphere({ sceneRef }) {
  return (
    <div className="atmos" aria-hidden="true">
      <NeuralNetCanvas sceneRef={sceneRef} />
      <div className="atmos-vignette" />
    </div>
  );
});

/* Small identity badge anchored to the top-left corner of the viewport.
   Avatar still carries the click-to-headpat easter egg. */
const IdentityBadge = memo(function IdentityBadge({ onAvatarClick, avatarRef }) {
  return (
    <div className="id-badge">
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
      <div className="id-badge-meta">
        <span className="id-badge-name">Qiankang Wang</span>
        <span className="id-badge-sub">UC Berkeley · DS '27</span>
      </div>
    </div>
  );
});

/* Vertical nav rail floating on the left edge of the viewport — appears
   only after the user has scrolled past the hero. Clicking a label
   smooth-scrolls to its section. */
const SideRail = memo(function SideRail({ active, scrollTo, visible }) {
  return (
    <nav
      className={`side-rail${visible ? " visible" : ""}`}
      aria-label="Section navigation"
    >
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
  );
});

/* Corner widget for socials + theme toggle, anchored bottom-right. */
const CornerControls = memo(function CornerControls({ theme, toggleTheme }) {
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
      <button className="sb-theme" onClick={toggleTheme} aria-label="Toggle dark mode">
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </div>
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
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
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

/* (TiltCard / useTilt removed — the editorial layout has no card chrome
   to tilt. Hover lift moved into per-element CSS transitions instead.) */

/* ── Hero scene ──
   First viewport of the page. The user's name is rendered HUGE in italic
   serif over the network on the left, the tagline types out below, then
   a scroll cue points down. Sets the page's overall art direction.

   id="hero" so the scroll-handler's SCENE_IDS picks up its centre as the
   first camera waypoint (the wide-overview shot). */
const HeroScene = memo(function HeroScene() {
  const tagline = useTypewriter(D.tagline);
  return (
    <section id="hero" className="hero-scene">
      <span className="hero-kicker">Qiankang (Kant) Wang · 2026 portfolio</span>
      <h1 className="hero-name">
        <span className="hero-name-line">Qiankang</span>
        <span className="hero-name-line hero-name-line-2">Wang.</span>
      </h1>
      <p className="hero-tagline">
        {tagline.text}
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
      <a href="#about" className="hero-cue" aria-label="Scroll to about">
        <span>Scroll</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <polyline points="19 12 12 19 5 12"/>
        </svg>
      </a>
    </section>
  );
});

/* ── Main ──
   SCENE_IDS drives the canvas camera path (one waypoint per id, in order),
   while NAV is what the nav rail shows (hero is the implicit entry, not
   a clickable rail item). */
const SCENE_IDS = ["hero", "about", "research", "publication", "projects", "skills"];
const NAV = ["About", "Research", "Publication", "Projects", "Skills"];

export default function Portfolio() {
  const [theme, toggleTheme] = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");
  const [repos, setRepos] = useState([]);
  const [repoLoading, setRepoLoading] = useState(true);

  // Continuous "scene index" handed to the canvas — a value in
  // [0, SCENE_IDS.length-1] that tracks which scene the user is currently
  // viewing, with smooth fractions in between. Scene 0 = hero (wide
  // network), 1 = about (input layer zoom), etc.
  const sceneRef = useRef(0);

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

        // Camera path: use ALL scenes (hero + 5 sections). Each scene's
        // anchor is its element's vertical centre in doc coords.
        const sceneEls = SCENE_IDS.map((id) => document.getElementById(id));
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

        // Nav rail highlight — flip when a NAV section's top crosses
        // the upper threshold of the viewport. (Hero isn't in the rail.)
        const navEls = NAV.map((n) => document.getElementById(n.toLowerCase()));
        const flipAt = winH * 0.4;
        for (let i = navEls.length - 1; i >= 0; i--) {
          if (navEls[i] && navEls[i].getBoundingClientRect().top < flipAt) {
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
      <a className="skip" href="#about">Skip to content</a>

      {/* ── Scroll progress ── */}
      <div className="scroll-progress" aria-hidden="true">
        <div
          className="scroll-progress-bar"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* ── Unified atmosphere ───────────────────────────────────────
         Full-bleed neural-network canvas sits behind everything as the
         page's living atmosphere. Identity badge, nav rail, and theme
         controls float in the viewport corners. Content scrolls in a
         single centred column on top — no split panes anywhere. */}
      <Atmosphere sceneRef={sceneRef} />
      <IdentityBadge onAvatarClick={onAvatarClick} avatarRef={avatarRef} />
      <SideRail active={active} scrollTo={scrollTo} visible={scrolled} />
      <CornerControls theme={theme} toggleTheme={toggleTheme} />

      <main className="main">

        {/* ── Hero — first viewport, giant name floating over the network ── */}
        <HeroScene />

        {/* ── About — editorial pull-quote intro, stats row, focus list ── */}
        <Section id="about">
          <div className="sect-meta">
            <span className="sect-n">01 · About</span>
          </div>
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

        {/* ── Research — year-led editorial rows, no card chrome ── */}
        <Section id="research">
          <div className="sect-meta">
            <span className="sect-n">02 · Research</span>
          </div>
          <h2 className="sect-title">Field notes<br/>from three labs.</h2>
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
                      <p className="exp-desc">{exp.desc}</p>
                      <span className="exp-tag">{exp.tag}</span>
                    </div>
                  </li>
                </StaggerItem>
              );
            })}
          </ol>
        </Section>

        {/* ── Publication — huge serif title, no card ── */}
        <Section id="publication">
          <div className="sect-meta">
            <span className="sect-n">03 · Publication</span>
            <span className="sect-meta-aux">{D.publication.venue} · {D.publication.year}</span>
          </div>
          <a
            href={D.publication.links[0]?.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="pub-link"
          >
            <h2 className="pub-title">{D.publication.title}</h2>
            <p className="pub-authors">
              {D.publication.authors} · <em>{D.publication.role}</em>
            </p>
            <span className="pub-cta">
              Read paper
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
          </a>
        </Section>

        {/* ── Projects — list rows, hover-revealed underline ── */}
        <Section id="projects">
          <div className="sect-meta">
            <span className="sect-n">04 · Projects</span>
          </div>
          <h2 className="sect-title">Things I built.</h2>
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
                      <span className="proj-lang">{repo.language || "—"}</span>
                      <span className="proj-arrow" aria-hidden="true">→</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ── Skills — pill cloud grouped under mono labels ── */}
        <Section id="skills">
          <div className="sect-meta">
            <span className="sect-n">05 · Skills</span>
          </div>
          <h2 className="sect-title">Tools of<br/>the trade.</h2>
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

        {/* ── Footer (inside main column so it scrolls with content) ── */}
        <footer className="foot">
          <div className="foot-inner">
            <div className="foot-copy">© {new Date().getFullYear()} {D.fullName} · Built with React</div>
          </div>
        </footer>
      </main>

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
