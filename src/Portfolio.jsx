import { useState, useEffect, useRef } from "react";

/* ----------------------------------------------------------------------
   Content
   ---------------------------------------------------------------------- */

const D = {
  name: "Qiankang Wang",
  fullName: "Qiankang (Kant) Wang",
  email: "qkwang@berkeley.edu",
  linkedin: "https://linkedin.com/in/qiankang-wang-737b97279",
  github: "https://github.com/xiaole5211314",
  avatar: "https://github.com/xiaole5211314.png",

  tagline:
    "Generative models for biology — diffusion and flow-based methods for protein and molecular design, grounded in scientific computing.",

  about:
    "I'm an undergraduate at UC Berkeley studying Data Science (expected May 2027). I work at the intersection of modern machine learning and biophysics — currently on representation learning at BAIR, and previously on GPU-accelerated Poisson–Boltzmann solvers for biomolecular simulation.",

  affiliations: [
    { label: "Lab", value: "BAIR" },
    { label: "Field", value: "ML × Biophysics" },
    { label: "Year", value: "Class of 2027" },
  ],

  experience: [
    {
      org: "Berkeley Artificial Intelligence Research (BAIR)",
      role: "Research Assistant",
      period: "Mar 2026 — Present",
      tag: "self-supervised learning",
      desc: [
        "Implementing the SimCLR contrastive learning framework for self-supervised representation learning on scientific data.",
      ],
    },
    {
      org: "AMBER pGM · Multi-Institutional Collaboration",
      role: "Research Assistant",
      period: "Nov 2025 — Mar 2026",
      tag: "scientific software",
      desc: [
        "Contributed to the AMBER pGM acceleration project: code integration, regression testing, and output-consistency checks across implementations.",
        "Worked with the AMBER / PMEMD codebase to analyze numerical discrepancies, including stability issues and random-seed effects.",
      ],
    },
    {
      org: "Computational Biophysics Lab · UC Irvine",
      role: "Research Assistant",
      period: "Jul 2024 — Nov 2025",
      tag: "GPU scientific computing",
      desc: [
        "Refactored core CG / BiCG solver modules into a LibTorch tensor-computation framework, achieving 2–3× faster iterative convergence via GPU parallelization and improving PBSA performance for large biomolecular systems.",
        "Built a custom Slurm scheduling pipeline and ran 1M+ PBSA energy-calculation jobs, raising average GPU utilization by ~20%.",
        "Produced PBSA benchmarking visualizations (heatmaps, runtime curves, error distributions) supporting algorithm optimization and the resulting publication.",
      ],
    },
  ],

  publication: {
    authors: "Wu, Y., Wang, Q., et al.",
    title:
      "AmberTorchPB: A Unified Framework for Poisson–Boltzmann-Based Reaction Field Energy Calculation via Tensor Computation",
    venue: "Journal of Chemical Theory and Computation",
    year: "2026",
    role: "Second author",
  },

  skills: {
    Languages: ["Python", "C++", "Java", "MATLAB", "Bash", "SQL"],
    "Machine Learning": [
      "PyTorch",
      "LibTorch",
      "TensorFlow",
      "scikit-learn",
      "Transformers",
      "CNNs",
      "Contrastive / SSL",
      "Diffusion models",
    ],
    "Scientific Computing": [
      "GPU optimization",
      "CG / BiCG solvers",
      "Poisson–Boltzmann / PBSA",
      "Molecular simulation",
    ],
    Tools: ["Linux", "Git", "Docker", "CMake", "Slurm", "Jupyter", "LaTeX"],
  },
};

const NAV = ["About", "Research", "Publication", "Skills"];

/* ----------------------------------------------------------------------
   Hero canvas — neural network with subtle bio motifs
   ---------------------------------------------------------------------- */

function NeuralNetCanvas() {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const layers = [5, 7, 9, 7, 5, 3];
    let nodes = [];
    let edges = [];
    let pulses = [];
    let strands = [];
    let edgeCursor = 0;
    let frame = 0;

    const isDark = () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

    const buildNetwork = () => {
      nodes = [];
      edges = [];
      pulses = [];
      strands = [];
      const cx = w * 0.5;
      const cy = h * 0.5;
      const netW = Math.min(w * 0.82, 1180);
      const netH = Math.min(h * 0.7, 620);
      const startX = cx - netW / 2;
      const layerGap = netW / (layers.length - 1);

      layers.forEach((count, layer) => {
        const x = startX + layerGap * layer;
        const usableH = netH * (0.76 + layer * 0.018);
        const startY = cy - usableH / 2;
        for (let i = 0; i < count; i++) {
          const ratio = count === 1 ? 0.5 : i / (count - 1);
          const curve = Math.sin((ratio - 0.5) * Math.PI) * 14;
          nodes.push({
            x,
            y: startY + ratio * usableH + curve,
            baseX: x,
            baseY: startY + ratio * usableH + curve,
            layer,
            r: 3.2 + (layer === 0 || layer === layers.length - 1 ? 0.4 : 0.9),
            phase: Math.random() * Math.PI * 2,
            activation: layer === 0 ? 0.4 : 0,
          });
        }
      });

      const layerStarts = layers.reduce((acc, count, i) => {
        acc.push(i === 0 ? 0 : acc[i - 1] + layers[i - 1]);
        return acc;
      }, []);

      for (let layer = 0; layer < layers.length - 1; layer++) {
        const aStart = layerStarts[layer];
        const bStart = layerStarts[layer + 1];
        for (let a = 0; a < layers[layer]; a++) {
          for (let b = 0; b < layers[layer + 1]; b++) {
            const distance = Math.abs(
              (a + 0.5) / layers[layer] - (b + 0.5) / layers[layer + 1]
            );
            if (distance < 0.38 || (a + b + layer) % 5 === 0) {
              edges.push({
                from: aStart + a,
                to: bStart + b,
                weight: 1 - Math.min(distance, 0.45),
              });
            }
          }
        }
      }

      // Just 4 strands now, in the corners. Less clutter.
      if (w >= 720) {
        const left = startX;
        const top = cy - netH * 0.34;
        const bottom = cy + netH * 0.34;
        strands = [
          { x: left + netW * 0.1, y: top + netH * 0.18, len: 11, angle: 0.18, phase: 0.2, bend: 9 },
          { x: left + netW * 0.18, y: bottom - netH * 0.12, len: 10, angle: 0.22, phase: 4.2, bend: 7 },
          { x: left + netW * 0.78, y: top + netH * 0.22, len: 11, angle: -0.2, phase: 1.5, bend: -8 },
          { x: left + netW * 0.82, y: bottom - netH * 0.18, len: 10, angle: -0.24, phase: 5.8, bend: -7 },
        ];
      }
    };

    const resize = () => {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNetwork();
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnPulse = () => {
      if (!edges.length || pulses.length > 14) return;
      const edge = edges[edgeCursor % edges.length];
      edgeCursor += 7;
      pulses.push({
        edge,
        t: 0,
        speed: reducedMotion ? 0.012 : 0.006 + Math.random() * 0.004,
        alpha: 0.42 + Math.random() * 0.26,
      });
    };

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      const dark = isDark();
      const accent = dark ? [139, 173, 230] : [47, 94, 158];
      const cool = dark ? [83, 106, 137] : [126, 145, 164];
      const dim = dark ? [45, 51, 59] : [200, 205, 210];
      const warm = dark ? [214, 154, 112] : [168, 101, 63];
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const t = frame * (reducedMotion ? 0.012 : 0.035);

      const grad = ctx.createRadialGradient(
        w * 0.58, h * 0.44, 0,
        w * 0.58, h * 0.44, Math.max(w, h) * 0.55
      );
      grad.addColorStop(0, rgba(accent, dark ? 0.055 : 0.045));
      grad.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      strands.forEach((m, mi) => {
        const drift = Math.sin(frame * 0.01 + m.phase) * 8;
        const step = 14;
        const dx = Math.cos(m.angle) * step;
        const dy = Math.sin(m.angle) * step;
        for (let i = 0; i < m.len; i++) {
          const wave = Math.sin(frame * 0.018 + i * 0.75 + m.phase);
          const arc = Math.sin((i / Math.max(1, m.len - 1)) * Math.PI) * (m.bend || 0);
          const x = m.x + dx * i + Math.sin(m.angle + Math.PI / 2) * (wave * 5 + arc);
          const y = m.y + dy * i + drift + Math.cos(m.angle + Math.PI / 2) * (wave * 5 + arc);
          const hot = (i / Math.max(1, m.len - 1) + frame * 0.006 + mi * 0.17) % 1;
          const active = hot > 0.42 && hot < 0.58;
          if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(x - dx * 0.72, y - dy * 0.72);
            ctx.lineTo(x - dx * 0.25, y - dy * 0.25);
            ctx.strokeStyle = rgba(dim, dark ? 0.28 : 0.2);
            ctx.lineWidth = active ? 0.95 : 0.65;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(x, y, active ? 2.1 : 1.4, 0, Math.PI * 2);
          ctx.fillStyle = rgba(
            i % 2 ? warm : accent,
            active ? (dark ? 0.78 : 0.62) : (dark ? 0.36 : 0.28)
          );
          ctx.fill();
        }
      });

      nodes.forEach((n) => {
        n.x = n.baseX + Math.sin(t + n.phase) * 2.2;
        n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 2.2;
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 130) {
          const pull = (130 - dist) / 130;
          n.x += (dx / dist) * pull * 8;
          n.y += (dy / dist) * pull * 8;
          n.activation = Math.max(n.activation, pull * 0.7);
        }
        n.activation *= 0.93;
      });

      edges.forEach((e) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        const act = Math.max(a.activation, b.activation);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = act > 0.08
          ? rgba(accent, 0.08 + act * 0.22)
          : rgba(dim, (dark ? 0.12 : 0.18) * e.weight);
        ctx.lineWidth = act > 0.08 ? 0.75 + act * 0.8 : 0.55;
        ctx.stroke();
      });

      if (frame % (reducedMotion ? 42 : 16) === 0) spawnPulse();

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed;
        if (p.t > 1) {
          nodes[p.edge.to].activation = 1;
          pulses.splice(i, 1);
          continue;
        }
        const a = nodes[p.edge.from];
        const b = nodes[p.edge.to];
        const px = a.x + (b.x - a.x) * p.t;
        const py = a.y + (b.y - a.y) * p.t;
        const glow = Math.sin(p.t * Math.PI);
        ctx.beginPath();
        ctx.arc(px, py, 2.1 + glow * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, p.alpha);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 9 + glow * 5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, 0.055 * glow);
        ctx.fill();
      }

      nodes.forEach((n) => {
        const mix = Math.min(1, n.activation);
        if (mix > 0.08) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 8 * mix, 0, Math.PI * 2);
          ctx.fillStyle = rgba(accent, mix * 0.08);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const cr = Math.round(cool[0] + (accent[0] - cool[0]) * mix);
        const cg = Math.round(cool[1] + (accent[1] - cool[1]) * mix);
        const cb = Math.round(cool[2] + (accent[2] - cool[2]) * mix);
        ctx.fillStyle = rgba([cr, cg, cb], dark ? 0.72 : 0.64);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.16 + mix * 0.25);
        ctx.lineWidth = 0.75;
        ctx.stroke();
      });

      raf.current = requestAnimationFrame(draw);
    };
    draw();

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => {
      mouse.current = { x: -9999, y: -9999 };
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}

/* ----------------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------------- */

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Section({ id, children, delay = 0 }) {
  const [ref, vis] = useInView();
  return (
    <section
      ref={ref}
      id={id}
      className="sect"
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

function TextReveal({ text, tag: Tag = "h1", className }) {
  const [ref, vis] = useInView(0.3);
  return (
    <Tag ref={ref} className={className}>
      {text.split(" ").map((w, i) => (
        <span
          key={i}
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
            }}
          >
            {w}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/* ----------------------------------------------------------------------
   Main
   ---------------------------------------------------------------------- */

export default function Portfolio() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroVis, setHeroVis] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const sects = NAV.map((n) => document.getElementById(n.toLowerCase()));
      for (let i = sects.length - 1; i >= 0; i--) {
        if (sects[i] && sects[i].getBoundingClientRect().top < 180) {
          setActive(NAV[i]);
          return;
        }
      }
      setActive("");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };
  const [expRef, expVis] = useInView();
  const [skillRef, skillVis] = useInView();

  return (
    <>
      <style>{CSS_TEXT}</style>
      <a className="skip" href="#about">Skip to content</a>

      <nav className={"nav" + (scrolled ? " scrolled" : "")}>
        <span className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Kant W.
        </span>
        <div className={"nav-links" + (menuOpen ? " open" : "")}>
          {NAV.map((n) => (
            <a
              key={n}
              href={"#" + n.toLowerCase()}
              className={active === n ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(n.toLowerCase());
              }}
            >
              {n}
            </a>
          ))}
        </div>
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "\u2715" : "\u2630"}
        </button>
      </nav>

      <header className="hero">
        <NeuralNetCanvas />
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
          <TextReveal text={D.fullName} tag="h1" />
          <p className={"hero-tagline" + (heroVis ? " vis" : "")}>
            {D.tagline}
          </p>
          <div className={"hero-cta" + (heroVis ? " vis" : "")}>
            <a className="btn primary" href={"mailto:" + D.email}>
              {"\u2709"} Email
            </a>
            <a className="btn" href={D.github} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a className="btn" href={D.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </div>
          <div className={"hero-meta" + (heroVis ? " vis" : "")}>
            {D.affiliations.map((a) => (
              <div key={a.label} className="hero-meta-item">
                <span>{a.label}</span>
                <strong>{a.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="scroll-hint">
          <div className="scroll-dot" />
          <span>Scroll</span>
        </div>
      </header>

      <main className="content">
        <Section id="about">
          <div className="section-head">
            <span className="sect-label">01 — About</span>
            <h2>Background</h2>
          </div>
          <p className="about-text">{D.about}</p>
        </Section>

        <Section id="research" delay={0.05}>
          <div className="section-head">
            <span className="sect-label">02 — Research</span>
            <h2>Experience</h2>
          </div>
          <div className="experience-board" ref={expRef}>
            {D.experience.map((exp, i) => (
              <StaggerItem key={exp.org} index={i} visible={expVis}>
                <article className="exp-card">
                  <div className="exp-meta">
                    <span>{exp.tag}</span>
                    <strong>{exp.period}</strong>
                  </div>
                  <div className="exp-body">
                    <h3>{exp.role}</h3>
                    <div className="exp-org">{exp.org}</div>
                    <ul>
                      {exp.desc.map((d, j) => (
                        <li key={j}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </div>
        </Section>

        <Section id="publication" delay={0.05}>
          <div className="section-head">
            <span className="sect-label">03 — Publication</span>
            <h2>Selected Publication</h2>
          </div>
          <article className="pub-card">
            <div className="pub-venue">
              <span>{D.publication.venue}</span>
              <strong>{D.publication.year}</strong>
            </div>
            <h3>{D.publication.title}</h3>
            <p className="pub-authors">
              {D.publication.authors}{" "}
              <em>· {D.publication.role}</em>
            </p>
          </article>
        </Section>

        <Section id="skills" delay={0.05}>
          <div className="section-head">
            <span className="sect-label">04 — Skills</span>
            <h2>Technical Skills</h2>
          </div>
          <div className="skill-grid" ref={skillRef}>
            {Object.entries(D.skills).map(([cat, items], ci) => (
              <StaggerItem key={cat} index={ci} visible={skillVis}>
                <article className="skill-card">
                  <div className="skill-cat">{cat}</div>
                  <div className="skill-pills">
                    {items.map((s) => (
                      <span key={s} className="pill">
                        {s}
                      </span>
                    ))}
                  </div>
                </article>
              </StaggerItem>
            ))}
          </div>
        </Section>
      </main>

      <footer className="foot">
        <div className="foot-cta">
          Open to research collaborations and conversations about ML for biology.
        </div>
        <div className="foot-links">
          <a href={"mailto:" + D.email}>Email</a>
          <a href={D.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={D.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </div>
        <div className="foot-copy">
          {"\u00a9"} {new Date().getFullYear()} {D.fullName}
        </div>
      </footer>

      <button
        className={"btt" + (scrolled ? " show" : "")}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
      >
        {"\u2191"}
      </button>
    </>
  );
}

const CSS_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Satoshi:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg: #F7F7F5;
  --bg2: #ECEDEB;
  --fg: #151719;
  --fg2: #4E565D;
  --fg3: #7D858B;
  --accent: #2F5E9E;
  --accent2: #173D72;
  --warm: #A8653F;
  --accent-soft: rgba(47,94,158,.08);
  --border: #DADDE0;
  --card: #FFFFFF;
  --serif: 'Instrument Serif', Georgia, serif;
  --sans: 'Satoshi', system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --radius: 10px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0F1114;
    --bg2: #171A1F;
    --fg: #EEF0F2;
    --fg2: #B8BEC5;
    --fg3: #78818A;
    --accent: #8BADE6;
    --accent2: #B7C8F0;
    --warm: #D69A70;
    --accent-soft: rgba(139,173,230,.1);
    --border: #292E35;
    --card: #171B20;
  }
}

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 80px; }
body {
  background: linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 88%, var(--bg2)) 100%);
  color: var(--fg);
  font-family: var(--sans);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--border) 42%, transparent) 1px, transparent 1px),
    linear-gradient(180deg, color-mix(in srgb, var(--border) 34%, transparent) 1px, transparent 1px);
  background-size: 152px 152px;
  -webkit-mask-image: radial-gradient(ellipse at 50% 18%, transparent 0%, transparent 28%, #000 58%, transparent 100%);
  mask-image: radial-gradient(ellipse at 50% 18%, transparent 0%, transparent 28%, #000 58%, transparent 100%);
  opacity: .26;
}
::selection { background: var(--accent); color: #fff; }

.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(1.25rem, 4vw, 3rem); height: 60px;
  background: transparent;
  transition: background .4s, box-shadow .4s, backdrop-filter .4s;
}
.nav.scrolled {
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-shadow: 0 1px 0 var(--border);
}
.nav-logo {
  font-family: var(--serif);
  font-size: 1.35rem;
  color: var(--fg);
  cursor: pointer;
}
.nav-links { display: flex; gap: 0; }
.nav-links a {
  color: var(--fg3);
  text-decoration: none;
  font-size: .76rem;
  font-weight: 500;
  letter-spacing: .07em;
  text-transform: uppercase;
  padding: .5rem .85rem;
  border-radius: 8px;
  transition: color .2s;
  cursor: pointer;
  position: relative;
}
.nav-links a::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--accent);
  transition: transform .3s cubic-bezier(.22,1,.36,1);
}
.nav-links a.active::after { transform: translateX(-50%) scaleX(1); }
.nav-links a:hover { color: var(--fg); }
.nav-links a.active { color: var(--accent); }
.hamburger {
  display: none;
  background: none; border: none;
  color: var(--fg);
  font-size: 1.4rem;
  cursor: pointer;
  padding: .25rem;
}
@media (max-width: 700px) {
  .nav-links {
    position: fixed; inset: 0;
    flex-direction: column;
    align-items: center; justify-content: center;
    gap: .75rem;
    background: color-mix(in srgb, var(--bg) 97%, transparent);
    backdrop-filter: blur(24px);
    opacity: 0; pointer-events: none;
    transition: opacity .3s;
  }
  .nav-links.open { opacity: 1; pointer-events: auto; }
  .nav-links a { font-size: 1.2rem; padding: .85rem 1.5rem; }
  .hamburger { display: block; }
}

.hero {
  min-height: 92svh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 6rem 1.5rem 4.5rem;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
}
.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 42%,
      color-mix(in srgb, var(--bg) 36%, transparent) 0%,
      color-mix(in srgb, var(--bg) 22%, transparent) 34%,
      color-mix(in srgb, var(--bg) 12%, transparent) 58%,
      color-mix(in srgb, var(--bg) 58%, transparent) 100%),
    linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--bg) 64%, transparent) 100%);
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 780px;
  padding: 0 1rem;
}
.hero-avatar {
  width: 104px; height: 104px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
  box-shadow: 0 10px 32px rgba(15,23,42,.08);
  margin-bottom: 1.6rem;
  opacity: 0;
  transform: scale(.85);
  transition: opacity .8s .1s cubic-bezier(.22,1,.36,1), transform .8s .1s cubic-bezier(.22,1,.36,1);
}
.hero-avatar.vis { opacity: 1; transform: scale(1); }
.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: .55rem;
  margin-bottom: .8rem;
  font-family: var(--mono);
  font-size: .68rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0;
  transform: translateY(10px);
  transition: all .7s .25s cubic-bezier(.22,1,.36,1);
}
.hero-kicker::before, .hero-kicker::after {
  content: '';
  width: 28px; height: 1px;
  background: var(--accent);
}
.hero-kicker.vis { opacity: 1; transform: translateY(0); }
.hero h1 {
  font-family: var(--serif);
  font-size: clamp(3rem, 6.4vw, 5.25rem);
  font-weight: 400;
  line-height: 1.05;
  color: var(--fg);
}
.hero-tagline {
  max-width: 580px;
  margin: 1rem auto 0;
  color: var(--fg2);
  font-size: 1.02rem;
  line-height: 1.65;
  opacity: 0;
  transform: translateY(14px);
  transition: all .7s .55s cubic-bezier(.22,1,.36,1);
}
.hero-tagline.vis { opacity: 1; transform: translateY(0); }
.hero-cta {
  display: flex; gap: .55rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 1.85rem;
  opacity: 0;
  transform: translateY(14px);
  transition: all .7s .7s cubic-bezier(.22,1,.36,1);
}
.hero-cta.vis { opacity: 1; transform: translateY(0); }
.btn {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  padding: .68rem 1.35rem;
  border-radius: 9999px;
  font-size: .85rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--fg);
  letter-spacing: .01em;
  transition: transform .2s, box-shadow .2s, background .2s;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 18px rgba(15,23,42,.08);
}
.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.btn.primary:hover {
  background: var(--accent2);
  box-shadow: 0 4px 24px color-mix(in srgb, var(--accent) 30%, transparent);
}
.hero-meta {
  display: flex;
  gap: 0;
  justify-content: center;
  margin: 1.85rem auto 0;
  opacity: 0;
  transform: translateY(14px);
  transition: all .7s .82s cubic-bezier(.22,1,.36,1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--card) 80%, transparent);
  backdrop-filter: blur(12px);
  overflow: hidden;
  width: fit-content;
  max-width: 100%;
}
.hero-meta.vis { opacity: 1; transform: translateY(0); }
.hero-meta-item {
  padding: .7rem 1.2rem;
  text-align: left;
  border-right: 1px solid var(--border);
}
.hero-meta-item:last-child { border-right: none; }
.hero-meta-item span {
  display: block;
  font-family: var(--mono);
  font-size: .58rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--fg3);
  margin-bottom: .2rem;
}
.hero-meta-item strong {
  display: block;
  font-size: .85rem;
  color: var(--fg);
  font-weight: 700;
  letter-spacing: -.005em;
}
.scroll-hint {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .35rem;
  color: var(--fg3);
  font-size: .66rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  font-weight: 500;
  z-index: 2;
  opacity: 0;
  animation: fadeIn 1s 1.4s forwards;
}
@keyframes fadeIn { to { opacity: 1; } }
.scroll-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--accent);
  animation: bounce 2s ease-in-out infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); opacity: .4; }
  50%      { transform: translateY(12px); opacity: 1; }
}

.content {
  max-width: 1080px;
  margin: 0 auto;
  padding: 5.5rem 1.75rem 6.5rem;
  display: flex;
  flex-direction: column;
  gap: 5.5rem;
  position: relative;
  z-index: 2;
}
.section-head {
  display: grid;
  grid-template-columns: minmax(140px, 200px) minmax(0, 1fr);
  align-items: end;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}
.sect-label {
  font-family: var(--mono);
  font-size: .68rem;
  letter-spacing: .1em;
  color: var(--accent);
  font-weight: 500;
  margin-bottom: .25rem;
  display: flex;
  align-items: center;
  gap: .6rem;
}
.sect-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--border), transparent);
}
.sect h2 {
  font-family: var(--serif);
  font-size: clamp(2rem, 3.2vw, 2.85rem);
  font-weight: 400;
  color: var(--fg);
  line-height: 1;
}
.about-text {
  max-width: 720px;
  color: var(--fg2);
  font-size: 1.02rem;
  line-height: 1.75;
}

.experience-board { display: grid; gap: .9rem; }
.experience-board > div { height: 100%; }
.exp-card {
  position: relative;
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 1.5rem;
  padding: 1.4rem 1.5rem;
  background: color-mix(in srgb, var(--card) 92%, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 12px 32px rgba(15,23,42,.035);
  transition: border-color .3s, box-shadow .3s, transform .3s;
}
.exp-card::before {
  content: '';
  position: absolute;
  left: 200px;
  top: 1.4rem;
  bottom: 1.4rem;
  width: 1px;
  background: linear-gradient(180deg, var(--border), transparent);
}
.exp-card:hover {
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
  box-shadow: 0 16px 38px rgba(15,23,42,.06);
  transform: translateY(-2px);
}
.exp-meta {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
}
.exp-meta span {
  font-family: var(--mono);
  font-size: .62rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--warm);
}
.exp-meta strong {
  font-family: var(--mono);
  font-size: .74rem;
  color: var(--fg3);
  font-weight: 500;
  line-height: 1.4;
}
.exp-body h3 {
  font-size: 1.02rem;
  font-weight: 750;
  color: var(--fg);
}
.exp-org {
  font-size: .85rem;
  color: var(--accent);
  font-weight: 600;
  margin-top: .2rem;
}
.exp-body ul {
  margin-top: .9rem;
  padding-left: 0;
  list-style: none;
  display: grid;
  gap: .5rem;
}
.exp-body li {
  position: relative;
  font-size: .9rem;
  color: var(--fg2);
  padding-left: 1rem;
  line-height: 1.6;
}
.exp-body li::before {
  content: '\u203A';
  position: absolute;
  left: 0; top: 0;
  color: var(--accent);
  font-weight: 700;
}

.pub-card {
  padding: 1.6rem 1.75rem;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--card) 94%, transparent),
    color-mix(in srgb, var(--accent) 6%, transparent));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 12px 32px rgba(15,23,42,.04);
}
.pub-venue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: .9rem;
  flex-wrap: wrap;
}
.pub-venue span {
  font-family: var(--mono);
  font-size: .7rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 500;
}
.pub-venue strong {
  font-family: var(--mono);
  font-size: .72rem;
  color: var(--fg3);
  font-weight: 500;
}
.pub-card h3 {
  font-family: var(--serif);
  font-size: clamp(1.2rem, 2vw, 1.55rem);
  font-weight: 400;
  line-height: 1.35;
  color: var(--fg);
  letter-spacing: -.01em;
}
.pub-authors {
  margin-top: .8rem;
  font-size: .88rem;
  color: var(--fg2);
}
.pub-authors em {
  font-style: normal;
  color: var(--warm);
  font-weight: 500;
  font-family: var(--mono);
  font-size: .78rem;
  letter-spacing: .04em;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .9rem;
}
.skill-grid > div { height: 100%; }
.skill-card {
  height: 100%;
  padding: 1.2rem 1.15rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--card) 92%, transparent);
  box-shadow: 0 10px 28px rgba(15,23,42,.035);
}
.skill-cat {
  font-family: var(--mono);
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--fg3);
  font-weight: 500;
  margin-bottom: .7rem;
}
.skill-pills {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
}
.pill {
  font-size: .8rem;
  font-weight: 500;
  padding: .38rem .85rem;
  border-radius: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--fg2);
  transition: all .25s cubic-bezier(.22,1,.36,1);
}
.pill:hover {
  color: var(--accent);
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--accent-soft);
}

.foot {
  text-align: center;
  padding: 3.5rem 1.5rem 2.5rem;
  border-top: 1px solid var(--border);
  color: var(--fg3);
  font-size: .82rem;
  position: relative;
  z-index: 2;
  background: linear-gradient(90deg,
    transparent,
    color-mix(in srgb, var(--accent) 4%, transparent),
    transparent);
}
.foot-cta {
  max-width: 540px;
  margin: 0 auto 1.4rem;
  font-family: var(--serif);
  font-size: clamp(1.3rem, 2.6vw, 1.75rem);
  line-height: 1.3;
  color: var(--fg);
}
.foot-links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}
.foot-links a {
  color: var(--fg2);
  text-decoration: none;
  font-weight: 500;
  transition: color .2s;
}
.foot-links a:hover { color: var(--accent); }
.foot-copy { color: var(--fg3); }

.btt {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--fg);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: .95rem;
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
  opacity: 0;
  transform: translateY(10px) scale(.9);
  transition: opacity .3s, transform .3s, background .2s, border-color .2s, color .2s;
  pointer-events: none;
  z-index: 50;
}
.btt.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.btt:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

.skip {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--accent);
  color: #fff;
  padding: .5rem .75rem;
  border-radius: 0 0 8px 0;
  z-index: 1000;
  font-size: .85rem;
}
.skip:focus { left: 0; }

@media (max-width: 920px) {
  .section-head { grid-template-columns: 1fr; gap: .35rem; }
  .exp-card { grid-template-columns: 1fr; gap: .9rem; }
  .exp-card::before { display: none; }
  .exp-meta { flex-direction: row; align-items: center; }
  .skill-grid { grid-template-columns: 1fr; }
  .content { max-width: 760px; }
}

@media (max-width: 640px) {
  body::before { opacity: .14; }
  .content { gap: 4rem; padding-top: 3.25rem; }
  .hero { min-height: 94svh; padding: 5rem 1rem 3rem; }
  .hero-avatar { width: 88px; height: 88px; margin-bottom: 1.1rem; }
  .hero-tagline { font-size: .94rem; }
  .btn { flex: 1; justify-content: center; min-width: 0; }
  .hero-cta { max-width: 320px; margin-left: auto; margin-right: auto; }
  .hero-meta-item { padding: .55rem .8rem; }
  .hero-meta-item strong { font-size: .78rem; }
  .scroll-hint { display: none; }
  .exp-card, .pub-card, .skill-card { padding: 1.15rem; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
  canvas { display: none; }
}
`;