import { useState, useEffect, useRef } from "react";

const D = {
    name: "Qiankang Wang",
    fullName: "Qiankang (Kant) Wang",
    title: "UC Berkeley Data Science | Machine Learning & Scientific Computing",
    email: "qkwang@berkeley.edu",
    linkedin: "https://linkedin.com/in/qiankang-wang-737b97279",
    github: "https://github.com/xiaole5211314",
    avatar: "https://github.com/xiaole5211314.png",
    tagline: "Machine learning, AI for biology, and scientific computing.",
    heroNote: "I work on research-oriented machine learning and scientific computing, with an interest in reliable systems for real data.",
    about:
        "I am Qiankang (Kant) Wang, an undergraduate at UC Berkeley studying Data Science. I am interested in machine learning, AI for biology, and scientific computing. This site is a short public overview of my work and interests.",

    highlights: [
        { value: "ML", label: "research" },
        { value: "AI", label: "for biology" },
        { value: "HPC", label: "scientific computing" },
    ],

    focusAreas: [
        {
            title: "Scientific ML",
            desc: "Learning methods for scientific and biological data.",
        },
        {
            title: "GPU Computing",
            desc: "Fast numerical workflows and scientific software.",
        },
        {
            title: "Research Systems",
            desc: "Tools for experiments, benchmarks, and analysis.",
        },
    ],

    snapshot: [
        { label: "Education", value: "UC Berkeley, B.A. Data Science" },
        { label: "Timeline", value: "Expected May 2027" },
        { label: "Publication", value: "JCTC 2026, second author" },
    ],

    education: {
        school: "University of California, Berkeley",
        degree: "B.A. in Data Science",
        period: "Expected May 2027",
        coursework:
            "Data science, machine learning, probability, and computer science.",
    },

    experience: [
        {
            org: "Berkeley Artificial Intelligence Research (BAIR)",
            role: "Research Assistant",
            period: "Mar 2026 - Present",
            desc: [
                "Working on machine learning research related to scientific and biological data.",
                "Exploring self-supervised learning, representation learning, and generative modeling.",
            ],
        },
        {
            org: "AMBER pGM - Multi-Institutional Collaboration",
            role: "Research Assistant",
            period: "Nov 2025 - Mar 2026",
            desc: [
                "Contributed to scientific software development and validation workflows.",
                "Supported code integration, testing, and numerical consistency checks.",
            ],
        },
        {
            org: "Computational Biophysics Lab, University of California, Irvine",
            role: "Research Assistant",
            period: "Jul 2024 - Nov 2025",
            desc: [
                "Worked on GPU-accelerated scientific computing for biomolecular simulation workflows.",
                "Built analysis and benchmarking tools for research experiments.",
            ],
        },
    ],

    publication: {
        title:
            "AmberTorchPB: A Unified Framework for Poisson-Boltzmann-Based Reaction Field Energy Calculation via Tensor Computation",
        journal: "Journal of Chemical Theory and Computation, 2026",
        role: "Second author",
    },

    projects: [
        {
            name: "Scientific Computing Pipeline",
            desc: "Research software for GPU-accelerated scientific computing and biomolecular simulation workflows.",
            stack: ["C++", "CUDA", "LibTorch", "Scientific Computing"],
            link: "https://github.com/xiaole5211314",
        },
        {
            name: "Representation Learning Experiments",
            desc: "Machine learning experiments focused on self-supervised learning and scientific data representations.",
            stack: ["PyTorch", "Self-supervised Learning", "Representation Learning"],
            link: "https://github.com/xiaole5211314",
        },
        {
            name: "ML From Scratch",
            desc: "Small implementations of classic machine learning ideas to better understand model training and inference.",
            stack: ["C++", "Machine Learning", "Algorithms"],
            link: "https://github.com/xiaole5211314",
        },
    ],

    skills: {
        "Languages": ["Python", "C++", "Java", "Bash"],
        "ML & Scientific Computing": [
            "PyTorch / LibTorch",
            "scikit-learn",
            "Pandas",
            "NumPy",
            "Matplotlib",
            "Self-supervised Learning",
            "Representation Learning",
        ],
        "Tools & Platforms": [
            "Linux",
            "Git",
            "CMake",
            "Jupyter",
            "Slurm",
            "VS Code",
        ],
        "Other": ["SQL", "React", "LaTeX"],
    },
};

const NAV = ["About", "Experience", "Projects", "Skills"];

/* Neural network hero canvas */
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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const layers = [5, 7, 9, 7, 5, 3];
    let nodes = [];
    let edges = [];
    let pulses = [];
    let edgeCursor = 0;
    let frame = 0;

    const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
    const rgba = (rgb, alpha) => "rgba(" + rgb.join(",") + "," + alpha + ")";

    const buildNetwork = () => {
      nodes = [];
      edges = [];
      pulses = [];
      const centerX = w < 720 ? w * 0.5 : w * 0.56;
      const centerY = h * 0.5;
      const networkW = Math.min(w * 0.9, 1280);
      const networkH = Math.min(h * 0.72, 640);
      const startX = centerX - networkW / 2;
      const layerGap = networkW / (layers.length - 1);

      layers.forEach((count, layer) => {
        const x = startX + layerGap * layer;
        const usableH = networkH * (0.76 + layer * 0.018);
        const startY = centerY - usableH / 2;
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
            const distance = Math.abs((a + 0.5) / layers[layer] - (b + 0.5) / layers[layer + 1]);
            if (distance < 0.38 || (a + b + layer) % 5 === 0) {
              edges.push({
                from: aStart + a,
                to: bStart + b,
                layer,
                weight: 1 - Math.min(distance, 0.45),
              });
            }
          }
        }
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
      if (!edges.length || pulses.length > 18) return;
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

      const grad = ctx.createRadialGradient(w * 0.58, h * 0.44, 0, w * 0.58, h * 0.44, Math.max(w, h) * 0.55);
      grad.addColorStop(0, rgba(accent, dark ? 0.055 : 0.045));
      grad.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const helixX = w < 720 ? w * 0.5 : w * 0.14;
      const helixY = h * 0.5;
      const helixH = Math.min(h * 0.72, 640);
      const helixAmp = Math.min(w * 0.052, 48);
      const helixStep = 24;
      const helixPhase = reducedMotion ? 0 : frame * 0.018;
      const helixTop = helixY - helixH / 2;
      const helixBottom = helixY + helixH / 2;
      const strand = (offset) => {
        ctx.beginPath();
        for (let y = helixTop; y <= helixBottom; y += 8) {
          const p = (y - helixTop) / helixH;
          const x = helixX + Math.sin(p * Math.PI * 6 + helixPhase + offset) * helixAmp;
          if (y === helixTop) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      };

      ctx.save();
      ctx.globalAlpha = w < 720 ? 0.18 : 0.28;
      strand(0);
      ctx.strokeStyle = rgba(accent, dark ? 0.34 : 0.24);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      strand(Math.PI);
      ctx.strokeStyle = rgba(warm, dark ? 0.32 : 0.22);
      ctx.stroke();

      for (let y = helixTop + 8; y <= helixBottom; y += helixStep) {
        const p = (y - helixTop) / helixH;
        const wave = Math.sin(p * Math.PI * 6 + helixPhase);
        const x1 = helixX + wave * helixAmp;
        const x2 = helixX - wave * helixAmp;
        const alpha = 0.08 + Math.abs(wave) * 0.1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.strokeStyle = rgba(dim, alpha);
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x1, y, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, 0.26);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = rgba(warm, 0.24);
        ctx.fill();
      }

      if (nodes.length && w >= 720) {
        const inputNodes = nodes.filter((n) => n.layer === 0);
        inputNodes.forEach((n, i) => {
          const y = helixTop + ((i + 1) / (inputNodes.length + 1)) * helixH;
          const x = helixX + Math.sin(((y - helixTop) / helixH) * Math.PI * 6 + helixPhase) * helixAmp;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + 80, y, n.x - 80, n.y, n.x, n.y);
          ctx.strokeStyle = rgba(accent, dark ? 0.08 : 0.06);
          ctx.lineWidth = 0.65;
          ctx.stroke();
        });
      }
      ctx.restore();

      nodes.forEach((n) => {
        n.x = n.baseX + Math.sin(t + n.phase) * 2.2;
        n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 2.2;
        const dx = n.x - mx, dy = n.y - my;
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
        const a = nodes[e.from], b = nodes[e.to];
        const act = Math.max(a.activation, b.activation);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.bezierCurveTo(a.x + (b.x - a.x) * 0.48, a.y, a.x + (b.x - a.x) * 0.52, b.y, b.x, b.y);
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
        const a = nodes[p.edge.from], b = nodes[p.edge.to];
        const cx1 = a.x + (b.x - a.x) * 0.48;
        const cy1 = a.y;
        const cx2 = a.x + (b.x - a.x) * 0.52;
        const cy2 = b.y;
        const mt = 1 - p.t;
        const px = mt * mt * mt * a.x + 3 * mt * mt * p.t * cx1 + 3 * mt * p.t * p.t * cx2 + p.t * p.t * p.t * b.x;
        const py = mt * mt * mt * a.y + 3 * mt * mt * p.t * cy1 + 3 * mt * p.t * p.t * cy2 + p.t * p.t * p.t * b.y;
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

    const onMove = (e) => { const rect = canvas.getBoundingClientRect(); mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }; };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); canvas.removeEventListener("mousemove", onMove); canvas.removeEventListener("mouseleave", onLeave); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />;
}

/* Subtle particle background */
function ParticleBG() {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w, h;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
    const count = Math.min(Math.floor((w * h) / 18000), 50);
    const pts = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, r: Math.random() * 1.2 + 0.4 }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const c = isDark() ? "139,173,230" : "47,94,158";
      for (const p of pts) { p.vx *= 0.99; p.vy *= 0.99; p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = "rgba(" + c + ",0.2)"; ctx.fill(); }
      for (let i = 0; i < pts.length; i++) { for (let j = i + 1; j < pts.length; j++) { const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d2 = dx * dx + dy * dy; if (d2 < 18000) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = "rgba(" + c + "," + (0.04 * (1 - d2 / 18000)) + ")"; ctx.lineWidth = 0.4; ctx.stroke(); } } }
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* Helpers */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold }); obs.observe(el); return () => obs.disconnect(); }, [threshold]);
  return [ref, visible];
}

function Section({ id, children, delay = 0 }) {
  const [ref, vis] = useInView();
  return <section ref={ref} id={id} className="sect" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(40px)", transition: "opacity 0.8s " + delay + "s cubic-bezier(.22,1,.36,1), transform 0.8s " + delay + "s cubic-bezier(.22,1,.36,1)" }}>{children}</section>;
}

function StaggerItem({ children, index, visible }) {
  return <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)", transition: "all 0.6s " + (0.1 * index) + "s cubic-bezier(.22,1,.36,1)" }}>{children}</div>;
}

function MagneticBtn({ children, className, ...props }) {
  const ref = useRef(null);
  const onMove = (e) => { const el = ref.current; if (!el) return; const rect = el.getBoundingClientRect(); const x = e.clientX - rect.left - rect.width / 2; const y = e.clientY - rect.top - rect.height / 2; el.style.transform = "translate(" + (x * 0.15) + "px, " + (y * 0.2) + "px)"; };
  const onLeave = () => { if (ref.current) ref.current.style.transform = "translate(0,0)"; };
  return <a ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave} {...props} style={{ transition: "transform 0.25s cubic-bezier(.22,1,.36,1)", ...props.style }}>{children}</a>;
}

function TextReveal({ text, tag: Tag = "h1", className }) {
  const [ref, vis] = useInView(0.3);
    return <Tag ref={ref} className={className}>{text.split(" ").map((w, i) => <span key={i} style={{
        display: "inline-block",
        overflow: "hidden",
        marginRight: "0.3em",
        paddingRight: "0.08em",
        paddingBottom: "0.12em"
    }}><span style={{ display: "inline-block", transform: vis ? "translateY(0)" : "translateY(110%)", transition: "transform 0.7s " + (0.04 * i) + "s cubic-bezier(.22,1,.36,1)" }}>{w}</span></span>)}</Tag>;
}

/* Main */
export default function Portfolio() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroVis, setHeroVis] = useState(false);

  useEffect(() => { setTimeout(() => setHeroVis(true), 100); }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const sects = NAV.map((n) => document.getElementById(n.toLowerCase()));
      for (let i = sects.length - 1; i >= 0; i--) { if (sects[i] && sects[i].getBoundingClientRect().top < 180) { setActive(NAV[i]); return; } }
      setActive("");
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); setMenuOpen(false); };
  const [expRef, expVis] = useInView();
  const [skillRef, skillVis] = useInView();

  return (
    <>
      <style>{CSS_TEXT}</style>
      <a className="skip" href="#about">Skip to content</a>
      <ParticleBG />

      <nav className={"nav" + (scrolled ? " scrolled" : "")}>
        <span className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Kant W.</span>
        <div className={"nav-links" + (menuOpen ? " open" : "")}>
          {NAV.map((n) => <a key={n} href={"#" + n.toLowerCase()} className={active === n ? "active" : ""} onClick={(e) => { e.preventDefault(); scrollTo(n.toLowerCase()); }}>{n}</a>)}
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? "\u2715" : "\u2630"}</button>
      </nav>

      <header className="hero">
        <NeuralNetCanvas />
        <div className="hero-overlay" />
        <div className="hero-content">
          <img className={"hero-avatar" + (heroVis ? " vis" : "")} src={D.avatar} alt={D.name + " avatar"} />
          <div className={"hero-kicker" + (heroVis ? " vis" : "")}>UC Berkeley Data Science</div>
          <TextReveal text={D.fullName} tag="h1" />
          <p className={"hero-sub" + (heroVis ? " vis" : "")}>{D.title}</p>
          <p className={"hero-tagline" + (heroVis ? " vis" : "")}>{D.tagline}</p>
          <p className={"hero-note" + (heroVis ? " vis" : "")}>{D.heroNote}</p>
          <div className={"hero-cta" + (heroVis ? " vis" : "")}>
            <MagneticBtn className="btn primary" href={"mailto:" + D.email}>{"\u2709"} Email Me</MagneticBtn>
            <MagneticBtn className="btn" href={D.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</MagneticBtn>
            <MagneticBtn className="btn" href={D.github} target="_blank" rel="noopener noreferrer">GitHub</MagneticBtn>
          </div>
          <div className={"hero-stats" + (heroVis ? " vis" : "")}>
            {D.highlights.map((h) => <div key={h.label} className="hero-stat"><strong>{h.value}</strong><span>{h.label}</span></div>)}
          </div>
        </div>
        <div className="scroll-hint"><div className="scroll-dot" /><span>Scroll</span></div>
      </header>

      <div className="content">
        <Section id="about">
          <span className="sect-label">01 ABOUT</span><h2>Overview</h2><p className="about-text">{D.about}</p>
          <div className="snapshot-grid">
            {D.snapshot.map((item) => <div key={item.label} className="snapshot-item"><span>{item.label}</span><strong>{item.value}</strong></div>)}
          </div>
          <div className="focus-grid">
            {D.focusAreas.map((area) => <article key={area.title} className="focus-card"><h3>{area.title}</h3><p>{area.desc}</p></article>)}
          </div>
        </Section>

        <Section id="experience" delay={0.05}>
          <span className="sect-label">02 RESEARCH EXPERIENCE</span><h2>Experience</h2>
          <div className="timeline" ref={expRef}>{D.experience.map((exp, i) => <StaggerItem key={exp.org} index={i} visible={expVis}><div className="tcard"><div className="tcard-head"><h3>{exp.role}</h3><span className="tcard-period">{exp.period}</span></div><div className="tcard-org">{exp.org}</div><ul>{exp.desc.map((d, j) => <li key={j}>{d}</li>)}</ul></div></StaggerItem>)}</div>
        </Section>

        <Section id="projects" delay={0.05}>
          <span className="sect-label">03 SELECTED WORK</span><h2>Selected Work</h2>
          <div className="project-grid">{D.projects.map((p) => <div key={p.name} className="pcard"><h3>{p.name}</h3><p>{p.desc}</p><div className="pcard-tags">{p.stack.map((t) => <span key={t} className="ptag">{t}</span>)}</div><a className="pcard-link" href={p.link} target="_blank" rel="noopener noreferrer">View on GitHub {"\u2192"}</a></div>)}</div>
        </Section>

        <Section id="skills" delay={0.05}>
          <span className="sect-label">04 SKILLS</span><h2>Technical Skills</h2>
          <div className="skill-grid" ref={skillRef}>{Object.entries(D.skills).map(([cat, items], ci) => <StaggerItem key={cat} index={ci} visible={skillVis}><div><div className="skill-cat">{cat}</div><div className="skill-pills">{items.map((s) => <span key={s} className="pill">{s}</span>)}</div></div></StaggerItem>)}</div>
        </Section>
      </div>

      <footer className="foot">
        <div className="foot-cta">Research interests across machine learning, scientific computing, and AI for biology.</div>
        <div className="foot-links"><a href={"mailto:" + D.email}>Email</a><a href={D.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a><a href={D.github} target="_blank" rel="noopener noreferrer">GitHub</a></div>
        <div>{"\u00a9"} {new Date().getFullYear()} {D.fullName}</div>
      </footer>

      <button className={"btt" + (scrolled ? " show" : "")} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">{"\u2191"}</button>
    </>
  );
}

const CSS_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Satoshi:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg:#F7F7F5;--bg2:#ECEDEB;--fg:#151719;--fg2:#4E565D;--fg3:#7D858B;--accent:#2F5E9E;--accent2:#173D72;--warm:#A8653F;--accent-soft:rgba(47,94,158,.08);--border:#DADDE0;--card:#FFFFFF;--glow-color:rgba(47,94,158,.04);--serif:'Instrument Serif',Georgia,serif;--sans:'Satoshi',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;--radius:8px}
@media(prefers-color-scheme:dark){:root{--bg:#0F1114;--bg2:#171A1F;--fg:#EEF0F2;--fg2:#B8BEC5;--fg3:#78818A;--accent:#8BADE6;--accent2:#B7C8F0;--warm:#D69A70;--accent-soft:rgba(139,173,230,.1);--border:#292E35;--card:#171B20;--glow-color:rgba(139,173,230,.05)}}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:80px}
body{background:linear-gradient(180deg,var(--bg) 0%,color-mix(in srgb,var(--bg) 88%,var(--bg2)) 100%);color:var(--fg);font-family:var(--sans);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--accent);color:#fff}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(1.25rem,4vw,3rem);height:60px;background:transparent;transition:background .4s,box-shadow .4s,backdrop-filter .4s}
.nav.scrolled{background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(20px) saturate(1.5);-webkit-backdrop-filter:blur(20px) saturate(1.5);box-shadow:0 1px 0 var(--border)}
.nav-logo{font-family:var(--serif);font-size:1.35rem;color:var(--fg);text-decoration:none;cursor:pointer}
.nav-links{display:flex;gap:0}
.nav-links a{color:var(--fg3);text-decoration:none;font-size:.78rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase;padding:.5rem .75rem;border-radius:8px;transition:color .2s,background .2s;cursor:pointer;position:relative}
.nav-links a::after{content:'';position:absolute;bottom:4px;left:50%;transform:translateX(-50%) scaleX(0);width:4px;height:4px;border-radius:50%;background:var(--accent);transition:transform .3s cubic-bezier(.22,1,.36,1)}
.nav-links a.active::after{transform:translateX(-50%) scaleX(1)}
.nav-links a:hover{color:var(--fg)}
.nav-links a.active{color:var(--accent)}
.hamburger{display:none;background:none;border:none;color:var(--fg);font-size:1.4rem;cursor:pointer;padding:.25rem}
@media(max-width:700px){.nav-links{position:fixed;top:0;left:0;right:0;bottom:0;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;background:color-mix(in srgb,var(--bg) 97%,transparent);backdrop-filter:blur(24px);opacity:0;pointer-events:none;transition:opacity .3s}.nav-links.open{opacity:1;pointer-events:auto}.nav-links a{font-size:1.2rem;padding:.85rem 1.5rem}.hamburger{display:block}}
.hero{min-height:92svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6rem 1.5rem 4.5rem;position:relative;overflow:hidden;border-bottom:1px solid var(--border)}
.hero-overlay{position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse at 50% 38%,transparent 22%,color-mix(in srgb,var(--bg) 62%,transparent) 56%,var(--bg) 88%),linear-gradient(180deg,transparent 0%,color-mix(in srgb,var(--bg) 84%,transparent) 100%);pointer-events:none}
.hero-content{position:relative;z-index:2;max-width:760px}
.hero-avatar{width:104px;height:104px;border-radius:50%;object-fit:cover;border:1px solid var(--border);box-shadow:0 10px 32px rgba(15,23,42,.08);margin-bottom:1.75rem;opacity:0;transform:scale(.8);transition:opacity .8s .1s cubic-bezier(.22,1,.36,1),transform .8s .1s cubic-bezier(.22,1,.36,1)}
.hero-avatar.vis{opacity:1;transform:scale(1)}
.hero-kicker{display:inline-flex;align-items:center;gap:.5rem;margin-bottom:.7rem;font-family:var(--mono);font-size:.68rem;letter-spacing:.11em;text-transform:uppercase;color:var(--accent);opacity:0;transform:translateY(12px);transition:all .7s .25s cubic-bezier(.22,1,.36,1)}
.hero-kicker::before,.hero-kicker::after{content:'';width:28px;height:1px;background:var(--accent)}
.hero-kicker.vis{opacity:1;transform:translateY(0)}
.hero h1{font-family:var(--serif);font-size:clamp(2.8rem,6vw,4.75rem);font-weight:400;letter-spacing:0;line-height:1.05;color:var(--fg)}
.hero-sub{font-size:1.05rem;color:var(--fg2);margin-top:.75rem;font-weight:500;letter-spacing:.02em;opacity:0;transform:translateY(16px);transition:all .7s .5s cubic-bezier(.22,1,.36,1)}
.hero-sub.vis{opacity:1;transform:translateY(0)}
.hero-tagline{max-width:500px;color:var(--fg3);margin:.75rem auto 0;font-size:.92rem;line-height:1.65;opacity:0;transform:translateY(16px);transition:all .7s .6s cubic-bezier(.22,1,.36,1)}
.hero-tagline.vis{opacity:1;transform:translateY(0)}
.hero-note{max-width:620px;margin:.9rem auto 0;color:var(--fg2);font-size:1rem;line-height:1.65;opacity:0;transform:translateY(16px);transition:all .7s .68s cubic-bezier(.22,1,.36,1)}
.hero-note.vis{opacity:1;transform:translateY(0)}
.hero-cta{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;margin-top:1.8rem;opacity:0;transform:translateY(16px);transition:all .7s .78s cubic-bezier(.22,1,.36,1)}
.hero-cta.vis{opacity:1;transform:translateY(0)}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.7rem 1.4rem;border-radius:9999px;font-size:.85rem;font-weight:600;text-decoration:none;border:1px solid var(--border);background:var(--card);color:var(--fg);letter-spacing:.01em}
.btn:hover{box-shadow:0 5px 18px rgba(15,23,42,.08)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.btn.primary:hover{background:var(--accent2);box-shadow:0 4px 24px color-mix(in srgb,var(--accent) 30%,transparent)}
.hero-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;max-width:520px;margin:1.6rem auto 0;opacity:0;transform:translateY(16px);transition:all .7s .88s cubic-bezier(.22,1,.36,1)}
.hero-stats.vis{opacity:1;transform:translateY(0)}
.hero-stat{padding:.85rem .7rem;border:1px solid var(--border);border-radius:var(--radius);background:color-mix(in srgb,var(--card) 84%,transparent);backdrop-filter:blur(12px)}
.hero-stat strong{display:block;font-family:var(--serif);font-size:1.65rem;font-weight:400;line-height:1;color:var(--fg)}
.hero-stat span{display:block;margin-top:.3rem;font-family:var(--mono);font-size:.64rem;letter-spacing:.06em;text-transform:uppercase;color:var(--fg3)}
.scroll-hint{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.35rem;color:var(--fg3);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;z-index:2;opacity:0;animation:fadeIn 1s 1.4s forwards}
@keyframes fadeIn{to{opacity:1}}
.scroll-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:bounce 2s ease-in-out infinite}
@keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(12px);opacity:1}}
.content{max-width:980px;margin:0 auto;padding:4rem 1.5rem 6rem;display:flex;flex-direction:column;gap:4rem;position:relative;z-index:2}
.sect-label{font-family:var(--mono);font-size:.68rem;letter-spacing:.1em;color:var(--accent);font-weight:500;margin-bottom:.75rem;display:flex;align-items:center;gap:.6rem}
.sect-label::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--border),transparent)}
.sect h2{font-family:var(--serif);font-size:clamp(1.7rem,3vw,2.2rem);font-weight:400;letter-spacing:0;color:var(--fg);margin-bottom:1rem}
.sect>p,.about-text{color:var(--fg2);font-size:.95rem;line-height:1.75}
.snapshot-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;margin-top:1.2rem}
.snapshot-item{padding:.85rem 1rem;border:1px solid var(--border);border-radius:var(--radius);background:color-mix(in srgb,var(--card) 86%,transparent)}
.snapshot-item span{display:block;font-family:var(--mono);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:.25rem}
.snapshot-item strong{display:block;font-size:.82rem;line-height:1.45;color:var(--fg);font-weight:650}
.focus-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.85rem;margin-top:1.4rem}
.focus-card{padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)}
.focus-card h3{font-size:.85rem;color:var(--fg);font-weight:700;margin-bottom:.35rem}
.focus-card p{font-size:.8rem;line-height:1.55;color:var(--fg2)}
.timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
.tcard{padding:1.4rem 1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);position:relative;overflow:hidden;transition:border-color .3s,box-shadow .3s}
.tcard::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(180deg,var(--accent),transparent);opacity:0;transition:opacity .3s}
.tcard:hover::before{opacity:1}
.tcard:hover{border-color:color-mix(in srgb,var(--accent) 20%,var(--border));box-shadow:0 8px 24px rgba(15,23,42,.055)}
.tcard-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:.5rem}
.tcard h3{font-size:.92rem;font-weight:700;color:var(--fg)}
.tcard-period{font-family:var(--mono);font-size:.73rem;color:var(--fg3)}
.tcard-org{font-size:.85rem;color:var(--accent);font-weight:600;margin-top:.2rem}
.edu-facts{display:flex;gap:1.5rem;margin-top:.6rem;flex-wrap:wrap}
.edu-facts span{font-size:.85rem;color:var(--fg2)}
.edu-facts strong{color:var(--fg)}
.muted-copy{font-size:.85rem;color:var(--fg3);margin-top:.5rem}
.tcard ul{margin-top:.7rem;padding-left:0;list-style:none}
.tcard li{position:relative;font-size:.87rem;color:var(--fg2);padding:.25rem 0 .25rem 1.1rem;line-height:1.6}
.tcard li::before{content:'\u203A';position:absolute;left:0;top:.25rem;color:var(--accent);font-weight:700;font-size:.9rem}
.pub-card{padding:1.4rem 1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);border-left:3px solid var(--accent)}
.pub-title{font-size:.9rem;font-weight:600;color:var(--fg);font-style:italic;line-height:1.5}
.pub-meta{font-size:.82rem;color:var(--fg3);margin-top:.4rem}
.project-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
.pcard{padding:1.4rem 1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);transition:border-color .3s,box-shadow .3s,transform .3s}
.pcard:hover{border-color:color-mix(in srgb,var(--accent) 25%,var(--border));box-shadow:0 8px 24px rgba(15,23,42,.055);transform:translateY(-2px)}
.pcard h3{font-size:.92rem;font-weight:700;color:var(--fg)}
.pcard p{font-size:.87rem;color:var(--fg2);margin-top:.35rem;line-height:1.6}
.pcard-tags{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem}
.ptag{font-family:var(--mono);font-size:.7rem;padding:.25rem .65rem;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-weight:500}
.pcard-link{display:inline-flex;align-items:center;gap:.3rem;margin-top:.85rem;font-size:.83rem;font-weight:600;color:var(--accent);text-decoration:none;transition:gap .2s}
.pcard-link:hover{gap:.55rem}
.skill-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem 2rem}
.skill-cat{font-family:var(--mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--fg3);font-weight:500;margin-bottom:.55rem}
.skill-pills{display:flex;flex-wrap:wrap;gap:.4rem}
.pill{font-size:.82rem;font-weight:500;padding:.4rem .9rem;border-radius:8px;background:var(--card);border:1px solid var(--border);color:var(--fg2);transition:all .25s cubic-bezier(.22,1,.36,1);cursor:default}
.pill:hover{color:var(--accent);border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 12px var(--accent-soft)}
.foot{text-align:center;padding:3.5rem 1.5rem;border-top:1px solid var(--border);color:var(--fg3);font-size:.82rem;position:relative;z-index:2}
.foot-cta{max-width:620px;margin:0 auto 1.25rem;font-family:var(--serif);font-size:clamp(1.35rem,3vw,1.9rem);line-height:1.25;color:var(--fg)}
.foot-links{display:flex;justify-content:center;gap:1.5rem;margin-bottom:.85rem}
.foot-links a{color:var(--fg2);text-decoration:none;font-weight:500;transition:color .2s}
.foot-links a:hover{color:var(--accent)}
.btt{position:fixed;right:1.25rem;bottom:1.25rem;width:42px;height:42px;border-radius:50%;border:1px solid var(--border);background:var(--card);color:var(--fg);cursor:pointer;display:grid;place-items:center;font-size:.95rem;box-shadow:0 4px 16px rgba(0,0,0,.08);opacity:0;transform:translateY(10px) scale(.9);transition:opacity .3s,transform .3s,background .2s,border-color .2s;pointer-events:none;z-index:50}
.btt.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
.btt:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.skip{position:absolute;left:-9999px;top:0;background:var(--accent);color:#fff;padding:.5rem .75rem;border-radius:0 0 8px 0;z-index:1000;font-size:.85rem}
.skip:focus{left:0}
@media(max-width:920px){.timeline,.project-grid{grid-template-columns:1fr}.content{max-width:760px}.tcard,.pcard{padding:1.2rem 1.25rem}}
@media(max-width:760px){.snapshot-grid,.focus-grid,.skill-grid{grid-template-columns:1fr}.hero-stats{grid-template-columns:1fr;max-width:320px}.hero-stat{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;text-align:left}.hero-stat span{text-align:right}.scroll-hint{display:none}}
@media(max-width:640px){.content{gap:3.5rem;padding-top:3rem}.hero{min-height:94svh;padding:5rem 1rem 3rem}.hero-avatar{width:92px;height:92px;margin-bottom:1.25rem}.hero-sub{font-size:.95rem}.hero-note{font-size:.92rem}.btn{width:100%;justify-content:center}.hero-cta{max-width:320px;margin-left:auto;margin-right:auto}.tcard,.pcard,.pub-card{padding:1.1rem}.hero-kicker::before,.hero-kicker::after{width:18px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}canvas{display:none}}
`;

