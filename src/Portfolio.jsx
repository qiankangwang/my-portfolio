import { useState, useEffect, useRef } from "react";

const D = {
    name: "Qiankang Wang",
    fullName: "Qiankang (Kant) Wang",
    title: "UC Berkeley Data Science | Machine Learning & Scientific Computing",
    email: "qkwang@berkeley.edu",
    linkedin: "https://linkedin.com/in/qiankang-wang-737b97279",
    github: "https://github.com/xiaole5211314",
    avatar: "https://github.com/xiaole5211314.png",
    tagline: "Machine learning, generative modeling, AI for biology, and scientific computing.",
    about:
        "I am Qiankang (Kant) Wang, an undergraduate at UC Berkeley studying Data Science. My interests include machine learning, generative modeling, AI for biology, and scientific computing. I enjoy working on technical problems that connect algorithms, systems, and real research workflows, from GPU-accelerated solvers to biological and scientific data.",

    education: {
        school: "University of California, Berkeley",
        degree: "B.A. in Data Science",
        gpa: "4.0 / 4.0",
        period: "Expected May 2027",
        coursework:
            "Principles and Techniques of Data Science, Probability, Machine Learning, Data Structures",
    },

    experience: [
        {
            org: "Berkeley Artificial Intelligence Research (BAIR)",
            role: "Research Assistant",
            period: "Mar 2026 - Present",
            desc: [
                "Implemented the SimCLR contrastive learning framework for self-supervised representation learning on scientific data.",
                "Engaged with research directions in generative modeling and AI for biology, with a focus on scientific data and biological applications.",
            ],
        },
        {
            org: "AMBER pGM - Multi-Institutional Collaboration",
            role: "Research Assistant",
            period: "Nov 2025 - Mar 2026",
            desc: [
                "Contributed to the AMBER pGM acceleration project, supporting code integration, regression testing, and output consistency checks across implementations.",
                "Worked with the AMBER/PMEMD codebase to analyze numerical discrepancies, including stability issues and random seed effects.",
            ],
        },
        {
            org: "Computational Biophysics Lab, University of California, Irvine",
            role: "Research Assistant",
            period: "Jul 2024 - Nov 2025",
            desc: [
                "Refactored core CG/BiCG solver modules into a LibTorch tensor-computation framework; achieved 3-5x faster iterative convergence through GPU parallelization, significantly improving PBSA performance and scalability for large biomolecular systems.",
                "Built a custom Slurm scheduling pipeline and ran 1,000,000+ PBSA energy calculation jobs, improving cluster throughput and increasing average GPU utilization by about 20%.",
                "Used Python (Pandas/Matplotlib/Seaborn) to conduct PBSA benchmarking and generate heatmaps, runtime curves, and error distribution plots, providing quantitative support for algorithm optimization and paper writing.",
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
            name: "AmberTorchPB Scientific Computing Pipeline",
            desc: "Refactored Poisson-Boltzmann solver components into a tensor-computation workflow with LibTorch, GPU acceleration, and benchmarking utilities for large biomolecular systems.",
            stack: ["LibTorch", "C++", "CUDA", "PBSA", "Scientific Computing"],
            link: "https://github.com/xiaole5211314",
        },
        {
            name: "Million-Job PBSA Benchmarking Workflow",
            desc: "Built a Slurm-based scheduling and analysis workflow for large-scale PBSA energy calculations, runtime profiling, and error distribution analysis across scientific workloads.",
            stack: ["Python", "Slurm", "Pandas", "Matplotlib", "HPC"],
            link: "https://github.com/xiaole5211314",
        },
        {
            name: "SimCLR for Scientific Representation Learning",
            desc: "Implemented a self-supervised contrastive learning pipeline inspired by SimCLR to study representation learning workflows for scientific and biological data.",
            stack: ["PyTorch", "SimCLR", "Self-supervised Learning", "Representation Learning"],
            link: "https://github.com/xiaole5211314",
        },
        {
            name: "Titanic Survival Prediction in C++",
            desc: "Implemented a decision tree algorithm from scratch in C++ using the Gini criterion, including node splitting, model training, and prediction. Built the project outside mainstream ML frameworks to better understand how AI algorithms are implemented from the ground up.",
            stack: ["C++", "Machine Learning", "Decision Trees"],
            link: "https://github.com/xiaole5211314",
        },
    ],

    skills: {
        "Programming Languages": ["Python", "C++", "Java", "MATLAB", "Bash"],
        "Machine Learning & Scientific Computing": [
            "PyTorch / LibTorch",
            "TensorFlow",
            "scikit-learn",
            "Pandas",
            "NumPy",
            "Matplotlib",
            "Seaborn",
            "Transformers",
            "CNNs",
            "Self-supervised Learning",
            "Contrastive Learning",
            "Representation Learning",
            "Diffusion Models",
            "Conjugate Gradient Methods",
            "Maximum Likelihood Estimation (MLE)",
            "Cross-validation",
            "Regularization",
        ],
        "Tools & Platforms": [
            "Linux",
            "Git",
            "Docker",
            "CMake",
            "Jupyter",
            "Slurm",
            "VS Code",
        ],
        "Web & Other": ["SQL", "HTML", "CSS", "React", "Django", "LaTeX", "Regex"],
    },
};

const NAV = ["About", "Education", "Experience", "Publication", "Projects", "Skills"];

/* Neural network hero canvas */
function NeuralNetCanvas() {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w, h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

    const layers = [4, 6, 8, 6, 4, 2];
    const nodes = [];
    const edges = [];
    const pulses = [];
    const codeSnippets = [
      "loss.backward()", "optimizer.step()", "torch.tensor()", "model.train()",
      "np.linalg.solve()", "cuda.synchronize()", "grad = \u2202L/\u2202w", "F.relu(x)",
      "conv2d(x, w)", "softmax(logits)", "\u2207\u03b8 J(\u03b8)", "x @ W + b",
      "BiCG(A, b)", "FFT(signal)", "\u03bb\u00b7\u2016w\u2016\u00b2", "P(y|x; \u03b8)",
    ];
    const floatingTexts = [];

    const marginX = w * 0.12;
    const usableW = w - marginX * 2;
    layers.forEach((count, li) => {
      const x = marginX + (usableW * li) / (layers.length - 1);
      const marginY = h * 0.18;
      const usableH = h - marginY * 2;
      for (let ni = 0; ni < count; ni++) {
        const y = marginY + (usableH * ni) / (count - 1 || 1);
        nodes.push({ x, y, layer: li, r: 4 + Math.random() * 2, baseX: x, baseY: y, phase: Math.random() * Math.PI * 2, activation: 0 });
      }
    });

    let nodeIdx = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      const currStart = nodeIdx;
      const currCount = layers[li];
      const nextStart = currStart + currCount;
      const nextCount = layers[li + 1];
      for (let a = 0; a < currCount; a++) {
        for (let b = 0; b < nextCount; b++) {
          if (Math.random() < 0.6) edges.push({ from: currStart + a, to: nextStart + b, weight: 0.3 + Math.random() * 0.7 });
        }
      }
      nodeIdx += currCount;
    }

    const spawnPulse = () => {
        const edge = edges[Math.floor(Math.random() * edges.length)];
        pulses.push({ edge, t: 0, speed: 0.004 + Math.random() * 0.006 });
    };


    const spawnText = () => {
      const txt = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
      const side = Math.random() < 0.5;
      floatingTexts.push({
        text: txt,
        x: side ? w * (0.02 + Math.random() * 0.15) : w * (0.83 + Math.random() * 0.15),
        y: h * (0.1 + Math.random() * 0.8),
        opacity: 0, phase: 0, life: 0, maxLife: 180 + Math.random() * 120,
      });
    };

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      const dark = isDark();
      const accent = dark ? [107, 142, 245] : [44, 90, 233];
      const dim = dark ? [50, 55, 70] : [180, 185, 200];
      const mx = mouse.current.x;
      const my = mouse.current.y;

      if (frame % 40 === 0 && floatingTexts.length < 6) spawnText();
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life++; ft.phase += 0.015;
        if (ft.life < 30) ft.opacity = ft.life / 30;
        else if (ft.life > ft.maxLife - 30) ft.opacity = (ft.maxLife - ft.life) / 30;
        else ft.opacity = 1;
        ft.y -= 0.15;
        if (ft.life > ft.maxLife) { floatingTexts.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = ft.opacity * (dark ? 0.18 : 0.13);
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgb(" + accent.join(",") + ")";
        ctx.fillText(ft.text, ft.x, ft.y + Math.sin(ft.phase) * 4);
        ctx.restore();
      }

      const t = frame * 0.06;
      nodes.forEach((n) => {
        n.x = n.baseX + Math.sin(t + n.phase) * 3;
        n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 3;
        const dx = n.x - mx, dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) { const push = (120 - dist) / 120; n.x += (dx / dist) * push * 12; n.y += (dy / dist) * push * 12; }
        n.activation *= 0.94;
      });

      edges.forEach((e) => {
        const a = nodes[e.from], b = nodes[e.to];
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        const act = Math.max(a.activation, b.activation);
        if (act > 0.1) {
          ctx.strokeStyle = "rgba(" + accent.join(",") + "," + (0.06 + act * 0.25) + ")";
          ctx.lineWidth = 0.6 + act * 1.2;
        } else {
          ctx.strokeStyle = "rgba(" + dim.join(",") + "," + (dark ? 0.12 : 0.1) + ")";
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();
      });

      if (frame % 12 === 0) spawnPulse();

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.t += p.speed;
        if (p.t > 1) { nodes[p.edge.to].activation = 1; pulses.splice(i, 1); continue; }
        const a = nodes[p.edge.from], b = nodes[p.edge.to];
        const px = a.x + (b.x - a.x) * p.t, py = a.y + (b.y - a.y) * p.t;
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + accent.join(",") + "," + (0.7 + 0.3 * Math.sin(p.t * Math.PI)) + ")";
        ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + accent.join(",") + ",0.12)"; ctx.fill();
      }

      nodes.forEach((n) => {
        if (n.activation > 0.1) {
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 8 * n.activation, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + accent.join(",") + "," + (n.activation * 0.15) + ")"; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const mix = n.activation;
        const cr = Math.round(dim[0] + (accent[0] - dim[0]) * mix);
        const cg = Math.round(dim[1] + (accent[1] - dim[1]) * mix);
        const cb = Math.round(dim[2] + (accent[2] - dim[2]) * mix);
        ctx.fillStyle = "rgba(" + cr + "," + cg + "," + cb + "," + (0.4 + mix * 0.6) + ")";
        ctx.fill();
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
      const c = isDark() ? "107,142,245" : "44,90,233";
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
          <TextReveal text={D.fullName} tag="h1" />
          <p className={"hero-sub" + (heroVis ? " vis" : "")}>{D.title}</p>
          <p className={"hero-tagline" + (heroVis ? " vis" : "")}>{D.tagline}</p>
          <div className={"hero-cta" + (heroVis ? " vis" : "")}>
            <MagneticBtn className="btn primary" href={"mailto:" + D.email}>{"\u2709"} Email Me</MagneticBtn>
            <MagneticBtn className="btn" href={D.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</MagneticBtn>
            <MagneticBtn className="btn" href={D.github} target="_blank" rel="noopener noreferrer">GitHub</MagneticBtn>
          </div>
        </div>
        <div className="scroll-hint"><div className="scroll-dot" /><span>Scroll</span></div>
      </header>

      <div className="content">
        <Section id="about"><span className="sect-label">01 ABOUT</span><h2>Hello.</h2><p className="about-text">{D.about}</p></Section>

        <Section id="education" delay={0.05}>
          <span className="sect-label">02 EDUCATION</span><h2>Education</h2>
          <div className="tcard">
            <div className="tcard-head"><h3>{D.education.degree}</h3><span className="tcard-period">{D.education.period}</span></div>
            <div className="tcard-org">{D.education.school}</div>
            <div style={{ display: "flex", gap: "1.5rem", marginTop: ".6rem", flexWrap: "wrap" }}><span style={{ fontSize: ".85rem", color: "var(--fg2)" }}><strong style={{ color: "var(--fg)" }}>GPA:</strong> {D.education.gpa}</span></div>
            <p style={{ fontSize: ".85rem", color: "var(--fg3)", marginTop: ".5rem" }}>{D.education.coursework}</p>
          </div>
        </Section>

        <Section id="experience" delay={0.05}>
          <span className="sect-label">03 RESEARCH EXPERIENCE</span><h2>Experience</h2>
          <div className="timeline" ref={expRef}>{D.experience.map((exp, i) => <StaggerItem key={exp.org} index={i} visible={expVis}><div className="tcard"><div className="tcard-head"><h3>{exp.role}</h3><span className="tcard-period">{exp.period}</span></div><div className="tcard-org">{exp.org}</div><ul>{exp.desc.map((d, j) => <li key={j}>{d}</li>)}</ul></div></StaggerItem>)}</div>
        </Section>

        <Section id="publication" delay={0.05}>
          <span className="sect-label">04 PUBLICATION</span><h2>Publication</h2>
          <div className="pub-card"><div className="pub-title">{D.publication.title}</div><div className="pub-meta">{D.publication.journal} {"\u00b7"} {D.publication.role}</div></div>
        </Section>

        <Section id="projects" delay={0.05}>
          <span className="sect-label">05 SELECTED WORK</span><h2>Selected Work</h2>
          {D.projects.map((p) => <div key={p.name} className="pcard"><h3>{p.name}</h3><p>{p.desc}</p><div className="pcard-tags">{p.stack.map((t) => <span key={t} className="ptag">{t}</span>)}</div><a className="pcard-link" href={p.link} target="_blank" rel="noopener noreferrer">View on GitHub {"\u2192"}</a></div>)}
        </Section>

        <Section id="skills" delay={0.05}>
          <span className="sect-label">06 SKILLS</span><h2>Technical Skills</h2>
          <div className="skill-grid" ref={skillRef}>{Object.entries(D.skills).map(([cat, items], ci) => <StaggerItem key={cat} index={ci} visible={skillVis}><div><div className="skill-cat">{cat}</div><div className="skill-pills">{items.map((s) => <span key={s} className="pill">{s}</span>)}</div></div></StaggerItem>)}</div>
        </Section>
      </div>

      <footer className="foot">
        <div className="foot-links"><a href={"mailto:" + D.email}>Email</a><a href={D.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a><a href={D.github} target="_blank" rel="noopener noreferrer">GitHub</a></div>
        <div>{"\u00a9"} {new Date().getFullYear()} {D.fullName}</div>
      </footer>

      <button className={"btt" + (scrolled ? " show" : "")} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">{"\u2191"}</button>
    </>
  );
}

const CSS_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Satoshi:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg:#F8F7F4;--bg2:#EFEEE9;--fg:#141413;--fg2:#4A4A45;--fg3:#8A8A84;--accent:#2C5AE9;--accent2:#1A3FA0;--accent-soft:rgba(44,90,233,.07);--border:#DDD;--card:#FFF;--glow-color:rgba(44,90,233,.04);--serif:'Instrument Serif',Georgia,serif;--sans:'Satoshi',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;--radius:14px}
@media(prefers-color-scheme:dark){:root{--bg:#0C0C0B;--bg2:#161614;--fg:#EDEDE8;--fg2:#A3A29D;--fg3:#6E6D68;--accent:#6B8EF5;--accent2:#8FAAF7;--accent-soft:rgba(107,142,245,.1);--border:#262624;--card:#141413;--glow-color:rgba(107,142,245,.06)}}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:80px}
body{background:var(--bg);color:var(--fg);font-family:var(--sans);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--accent);color:#fff}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(1.25rem,4vw,3rem);height:60px;background:transparent;transition:background .4s,box-shadow .4s,backdrop-filter .4s}
.nav.scrolled{background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(20px) saturate(1.5);-webkit-backdrop-filter:blur(20px) saturate(1.5);box-shadow:0 1px 0 var(--border)}
.nav-logo{font-family:var(--serif);font-size:1.35rem;color:var(--fg);text-decoration:none;cursor:pointer;font-style:italic}
.nav-links{display:flex;gap:0}
.nav-links a{color:var(--fg3);text-decoration:none;font-size:.78rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase;padding:.5rem .75rem;border-radius:8px;transition:color .2s,background .2s;cursor:pointer;position:relative}
.nav-links a::after{content:'';position:absolute;bottom:4px;left:50%;transform:translateX(-50%) scaleX(0);width:4px;height:4px;border-radius:50%;background:var(--accent);transition:transform .3s cubic-bezier(.22,1,.36,1)}
.nav-links a.active::after{transform:translateX(-50%) scaleX(1)}
.nav-links a:hover{color:var(--fg)}
.nav-links a.active{color:var(--accent)}
.hamburger{display:none;background:none;border:none;color:var(--fg);font-size:1.4rem;cursor:pointer;padding:.25rem}
@media(max-width:700px){.nav-links{position:fixed;top:0;left:0;right:0;bottom:0;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;background:color-mix(in srgb,var(--bg) 97%,transparent);backdrop-filter:blur(24px);opacity:0;pointer-events:none;transition:opacity .3s}.nav-links.open{opacity:1;pointer-events:auto}.nav-links a{font-size:1.2rem;padding:.85rem 1.5rem}.hamburger{display:block}}
.hero{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6rem 1.5rem 4rem;position:relative;overflow:hidden}
.hero-overlay{position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse at center,transparent 30%,var(--bg) 80%);pointer-events:none}
.hero-content{position:relative;z-index:2}
.hero-avatar{width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid var(--border);margin-bottom:1.75rem;opacity:0;transform:scale(.8);transition:opacity .8s .1s cubic-bezier(.22,1,.36,1),transform .8s .1s cubic-bezier(.22,1,.36,1)}
.hero-avatar.vis{opacity:1;transform:scale(1)}
.hero h1{font-family:var(--serif);font-size:clamp(2.8rem,6vw,4.5rem);font-weight:400;font-style:italic;letter-spacing:-.02em;line-height:1.1;color:var(--fg)}
.hero-sub{font-size:1.05rem;color:var(--fg2);margin-top:.75rem;font-weight:500;letter-spacing:.02em;opacity:0;transform:translateY(16px);transition:all .7s .5s cubic-bezier(.22,1,.36,1)}
.hero-sub.vis{opacity:1;transform:translateY(0)}
.hero-tagline{max-width:500px;color:var(--fg3);margin:.75rem auto 0;font-size:.92rem;line-height:1.65;opacity:0;transform:translateY(16px);transition:all .7s .6s cubic-bezier(.22,1,.36,1)}
.hero-tagline.vis{opacity:1;transform:translateY(0)}
.hero-cta{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;margin-top:2rem;opacity:0;transform:translateY(16px);transition:all .7s .75s cubic-bezier(.22,1,.36,1)}
.hero-cta.vis{opacity:1;transform:translateY(0)}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.7rem 1.4rem;border-radius:9999px;font-size:.85rem;font-weight:600;text-decoration:none;border:1px solid var(--border);background:var(--card);color:var(--fg);letter-spacing:.01em}
.btn:hover{box-shadow:0 4px 20px rgba(0,0,0,.08)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.btn.primary:hover{background:var(--accent2);box-shadow:0 4px 24px color-mix(in srgb,var(--accent) 30%,transparent)}
.scroll-hint{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.35rem;color:var(--fg3);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;z-index:2;opacity:0;animation:fadeIn 1s 1.4s forwards}
@keyframes fadeIn{to{opacity:1}}
.scroll-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:bounce 2s ease-in-out infinite}
@keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(12px);opacity:1}}
.content{max-width:700px;margin:0 auto;padding:2rem 1.5rem 6rem;display:flex;flex-direction:column;gap:5rem;position:relative;z-index:2}
.sect-label{font-family:var(--mono);font-size:.68rem;letter-spacing:.1em;color:var(--accent);font-weight:500;margin-bottom:.75rem;display:flex;align-items:center;gap:.6rem}
.sect-label::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--border),transparent)}
.sect h2{font-family:var(--serif);font-size:clamp(1.7rem,3vw,2.2rem);font-weight:400;font-style:italic;letter-spacing:-.01em;color:var(--fg);margin-bottom:1rem}
.sect>p,.about-text{color:var(--fg2);font-size:.95rem;line-height:1.75}
.timeline{display:flex;flex-direction:column;gap:1.25rem}
.tcard{padding:1.4rem 1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);position:relative;overflow:hidden;transition:border-color .3s,box-shadow .3s}
.tcard::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(180deg,var(--accent),transparent);opacity:0;transition:opacity .3s}
.tcard:hover::before{opacity:1}
.tcard:hover{border-color:color-mix(in srgb,var(--accent) 20%,var(--border));box-shadow:0 8px 32px rgba(0,0,0,.06)}
.tcard-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:.5rem}
.tcard h3{font-size:.92rem;font-weight:700;color:var(--fg)}
.tcard-period{font-family:var(--mono);font-size:.73rem;color:var(--fg3)}
.tcard-org{font-size:.85rem;color:var(--accent);font-weight:600;margin-top:.2rem}
.tcard ul{margin-top:.7rem;padding-left:0;list-style:none}
.tcard li{position:relative;font-size:.87rem;color:var(--fg2);padding:.25rem 0 .25rem 1.1rem;line-height:1.6}
.tcard li::before{content:'\u203A';position:absolute;left:0;top:.25rem;color:var(--accent);font-weight:700;font-size:.9rem}
.pub-card{padding:1.4rem 1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);border-left:3px solid var(--accent)}
.pub-title{font-size:.9rem;font-weight:600;color:var(--fg);font-style:italic;line-height:1.5}
.pub-meta{font-size:.82rem;color:var(--fg3);margin-top:.4rem}
.pcard{padding:1.4rem 1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);transition:border-color .3s,box-shadow .3s,transform .3s}
.pcard:hover{border-color:color-mix(in srgb,var(--accent) 25%,var(--border));box-shadow:0 8px 32px rgba(0,0,0,.06);transform:translateY(-3px)}
.pcard h3{font-size:.92rem;font-weight:700;color:var(--fg)}
.pcard p{font-size:.87rem;color:var(--fg2);margin-top:.35rem;line-height:1.6}
.pcard-tags{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem}
.ptag{font-family:var(--mono);font-size:.7rem;padding:.25rem .65rem;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-weight:500}
.pcard-link{display:inline-flex;align-items:center;gap:.3rem;margin-top:.85rem;font-size:.83rem;font-weight:600;color:var(--accent);text-decoration:none;transition:gap .2s}
.pcard-link:hover{gap:.55rem}
.skill-grid{display:flex;flex-direction:column;gap:1.5rem}
.skill-cat{font-family:var(--mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--fg3);font-weight:500;margin-bottom:.55rem}
.skill-pills{display:flex;flex-wrap:wrap;gap:.4rem}
.pill{font-size:.82rem;font-weight:500;padding:.4rem .9rem;border-radius:8px;background:var(--card);border:1px solid var(--border);color:var(--fg2);transition:all .25s cubic-bezier(.22,1,.36,1);cursor:default}
.pill:hover{color:var(--accent);border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 12px var(--accent-soft)}
.foot{text-align:center;padding:3.5rem 1.5rem;border-top:1px solid var(--border);color:var(--fg3);font-size:.82rem;position:relative;z-index:2}
.foot-links{display:flex;justify-content:center;gap:1.5rem;margin-bottom:.85rem}
.foot-links a{color:var(--fg2);text-decoration:none;font-weight:500;transition:color .2s}
.foot-links a:hover{color:var(--accent)}
.btt{position:fixed;right:1.25rem;bottom:1.25rem;width:42px;height:42px;border-radius:50%;border:1px solid var(--border);background:var(--card);color:var(--fg);cursor:pointer;display:grid;place-items:center;font-size:.95rem;box-shadow:0 4px 16px rgba(0,0,0,.08);opacity:0;transform:translateY(10px) scale(.9);transition:opacity .3s,transform .3s,background .2s,border-color .2s;pointer-events:none;z-index:50}
.btt.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
.btt:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.skip{position:absolute;left:-9999px;top:0;background:var(--accent);color:#fff;padding:.5rem .75rem;border-radius:0 0 8px 0;z-index:1000;font-size:.85rem}
.skip:focus{left:0}
@media(max-width:640px){.content{gap:3.5rem}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}canvas{display:none}}
`;

