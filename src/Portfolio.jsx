import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import D from "./data";
import "./Portfolio.css";

const NeuralNetCanvas = lazy(() => import("./NeuralNetCanvas"));

/* ----------------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------------- */

function AmbientBg() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="amb-orb amb-1" />
      <div className="amb-orb amb-2" />
    </div>
  );
}

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Section({ id, children, delay = 0, ...rest }) {
  const [ref, vis] = useInView();
  return (
    <section
      ref={ref}
      id={id}
      className="sect"
      {...rest}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.8s ${delay}s cubic-bezier(.22,1,.36,1), transform 0.8s ${delay}s cubic-bezier(.22,1,.36,1)`,
      }}
    >
      {children}
    </section>
  );
}

function StaggerItem({ children, index, visible }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s ${0.08 * index}s cubic-bezier(.22,1,.36,1)`,
      }}
    >
      {children}
    </div>
  );
}

function TextReveal({ text, tag: Tag = "h1", className, wordColors = null }) {
  const [ref, vis] = useInView(0.3);
  const words = text.split(" ");
  const last  = Math.max(1, words.length - 1);
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => {
        const color = wordColors
          ? wordColors[Math.round((i / last) * (wordColors.length - 1))]
          : undefined;
        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              display: "inline-block",
              overflow: "hidden",
              marginRight: "0.3em",
              paddingRight: "0.08em",
              paddingBottom: "0.12em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: vis ? "translateY(0)" : "translateY(110%)",
                transition: `transform 0.7s ${0.05 * i}s cubic-bezier(.22,1,.36,1)`,
                ...(color ? { color } : {}),
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </Tag>
  );
}

function CountUp({ target, suffix = "", duration = 1800 }) {
  const [ref, visible] = useInView(0.5);
  const raf = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const el = ref.current;
    if (!el) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [visible, target, suffix, duration, ref]);

  return <span ref={ref}>0{suffix}</span>;
}

/* ----------------------------------------------------------------------
   Dark mode hook
   ---------------------------------------------------------------------- */

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

/* ----------------------------------------------------------------------
   Main
   ---------------------------------------------------------------------- */

const NAV = ["About", "Research", "Publication", "Projects", "Skills"];

export default function Portfolio() {
  const [theme, toggleTheme]     = useTheme();
  const [scrolled, setScrolled]  = useState(false);
  const [active, setActive]      = useState("");
  const [menuOpen, setMenuOpen]  = useState(false);
  const [heroVis, setHeroVis]    = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          const sects = NAV.map((n) => document.getElementById(n.toLowerCase()));
          for (let i = sects.length - 1; i >= 0; i--) {
            if (sects[i] && sects[i].getBoundingClientRect().top < 180) {
              setActive(NAV[i]);
              ticking = false;
              return;
            }
          }
          setActive("");
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    fetch("https://api.github.com/users/xiaole5211314/repos?sort=updated&per_page=6")
      .then((r) => r.json())
      .then((data) => {
        setRepos(Array.isArray(data) ? data : []);
        setRepoLoading(false);
      })
      .catch(() => setRepoLoading(false));
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  const [expRef, expVis]     = useInView();
  const [skillRef, skillVis] = useInView();
  const [copied, setCopied]  = useState(false);
  const [repos, setRepos]         = useState([]);
  const [repoLoading, setRepoLoading] = useState(true);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(D.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <>
      <AmbientBg />
      <a className="skip" href="#about">Skip to content</a>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className={"nav" + (scrolled ? " scrolled" : "")}>
        <span className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Kant W.
        </span>
        <div className="nav-right">
          <div className={"nav-links" + (menuOpen ? " open" : "")}>
            {NAV.map((n) => (
              <a
                key={n}
                href={"#" + n.toLowerCase()}
                className={active === n ? "active" : ""}
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
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="hero">
        <Suspense fallback={<div className="canvas-placeholder" />}>
          <NeuralNetCanvas />
        </Suspense>
        <div className="hero-overlay" />
        <div className="hero-content">
          <img
            className={"hero-avatar" + (heroVis ? " vis" : "")}
            src={D.avatar}
            alt={D.name}
          />
          <div className={"hero-kicker" + (heroVis ? " vis" : "")}>
            UC Berkeley · Data Science · 2027
          </div>
          <TextReveal text={D.fullName} tag="h1" className="gradient-text" />
          <div className={"hero-rule" + (heroVis ? " vis" : "")} />
          <p className={"hero-tagline" + (heroVis ? " vis" : "")}>{D.tagline}</p>
          <div className={"hero-focuses" + (heroVis ? " vis" : "")}>
            {D.focuses.map((f) => <span key={f} className="focus-tag">{f}</span>)}
          </div>
          <div className={"hero-cta" + (heroVis ? " vis" : "")}>
            <a className="btn primary" href={"mailto:" + D.email}>{"✉"} Email</a>
            <a className="btn" href={D.github}   target="_blank" rel="noopener noreferrer">GitHub</a>
            <a className="btn" href={D.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
        <div className="scroll-hint">
          <div className="scroll-mouse">
            <div className="scroll-wheel" />
          </div>
          <span>Scroll</span>
        </div>
      </header>

      <main className="content">

        {/* ── About ───────────────────────────────────────────── */}
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
            <p className="about-text">{D.about}</p>
          </div>
        </Section>

        {/* ── Research / Timeline ─────────────────────────────── */}
        <Section id="research" delay={0.05} data-n="02">
          <div className="section-head">
            <span className="sect-n">02</span>
            <h2>Research</h2>
          </div>
          <div className="timeline" ref={expRef}>
            {D.experience.map((exp, i) => (
              <StaggerItem key={exp.org} index={i} visible={expVis}>
                <div className="tl-item">
                  <div className="tl-rail">
                    <div className="tl-dot" />
                  </div>
                  <div className="tl-card" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`); }}>
                    <div className="tl-top">
                      <span className="tl-tag">{exp.tag}</span>
                      <time className="tl-period">{exp.period}</time>
                    </div>
                    <h3 className="tl-role">{exp.role}</h3>
                    <div className="tl-org">{exp.org}</div>
                    <p className="tl-desc">{exp.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </div>
        </Section>

        {/* ── Publication ─────────────────────────────────────── */}
        <Section id="publication" delay={0.05} data-n="03">
          <div className="section-head">
            <span className="sect-n">03</span>
            <h2>Publication</h2>
          </div>
          <article
            className="pub-card"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - r.left) / r.width - 0.5;
              const y = (e.clientY - r.top) / r.height - 0.5;
              e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`);
              e.currentTarget.style.setProperty('--rx', `${y * -8}deg`);
              e.currentTarget.style.setProperty('--ry', `${x * 8}deg`);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty('--rx', '0deg');
              e.currentTarget.style.setProperty('--ry', '0deg');
            }}
          >
            <div className="pub-venue">
              <span>{D.publication.venue}</span>
              <strong>{D.publication.year}</strong>
            </div>
            <h3>{D.publication.title}</h3>
            <p className="pub-authors">
              {D.publication.authors} <em>· {D.publication.role}</em>
            </p>
            {D.publication.links && D.publication.links.length > 0 && (
              <div className="pub-links">
                {D.publication.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pub-link"
                  >
                    {l.label} →
                  </a>
                ))}
              </div>
            )}
          </article>
        </Section>

        {/* ── Projects ────────────────────────────────────────── */}
        <Section id="projects" delay={0.05} data-n="04">
          <div className="section-head">
            <span className="sect-n">04</span>
            <h2>Projects</h2>
          </div>
          {repoLoading ? (
            <div className="projects-loading">Loading repositories…</div>
          ) : (
            <div className="projects-grid">
              {repos.map((repo) => (
                <a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-card"
                >
                  <h3>{repo.name}</h3>
                  <p>{repo.description || "No description provided."}</p>
                  <div className="project-meta">
                    {repo.language && <span>{repo.language}</span>}
                    <span>⭐ {repo.stargazers_count}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Section>

        {/* ── Skills / Bento ──────────────────────────────────── */}
        <Section id="skills" delay={0.05} data-n="05">
          <div className="section-head">
            <span className="sect-n">04</span>
            <h2>Skills</h2>
          </div>
          <div className="skill-bento" ref={skillRef}>
            {Object.entries(D.skills).map(([cat, items], ci) => (
              <StaggerItem key={cat} index={ci} visible={skillVis}>
                <article className="skill-card" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`); }}>
                  <div className="skill-cat">{cat}</div>
                  <div className="skill-pills">
                    {items.map((s) => (
                      <span key={s} className="pill">{s}</span>
                    ))}
                  </div>
                </article>
              </StaggerItem>
            ))}
          </div>
        </Section>

      </main>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="cta">
        <h2>Let&rsquo;s connect</h2>
        <p>
          I&rsquo;m always open to discussing research collaborations, new opportunities,
          and interesting problems at the intersection of ML and science.
        </p>
        <div className="cta-actions">
          <button className="btn primary" onClick={copyEmail}>
            {copied ? "✓ Copied" : "✉ Copy Email"}
          </button>
        </div>
        <div className="cta-links">
          <a href={D.github}   target="_blank" rel="noopener noreferrer">GitHub</a>
          <span className="cta-sep" />
          <a href={D.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="foot">
        <div className="foot-copy">{"©"} {new Date().getFullYear()} {D.fullName}</div>
      </footer>

      <button
        className={"btt" + (scrolled ? " show" : "")}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
      >
        {"↑"}
      </button>
    </>
  );
}
