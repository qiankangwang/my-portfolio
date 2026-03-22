import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-scroll";
import "./styles.css";

const data = {
  name: "Kant (Qiankang) Wang",
  title: "Data Science Student @ UC Berkeley",
  email: "qkwang@berkeley.edu",
  linkedin: "https://linkedin.com/in/qiankang-wang-737b97279",
  github: "https://github.com/xiaole5211314",
  avatar: "https://github.com/xiaole5211314.png",

  tagline:
    "Interested in machine learning, scientific computing, and research-oriented engineering.",

  highlights: [
    { label: "Focus", value: "ML + Scientific Computing" },
    { label: "Background", value: "Research + Engineering" },
    { label: "Tools", value: "Python, C++, PyTorch" }
  ],

  about:
    "Hi, I'm Kant, a Data Science student at UC Berkeley. My interests lie in machine learning, scientific computing, and research-oriented engineering. I enjoy working on technical problems that connect algorithms, systems, and practical experimentation.",

  education: {
    school: "University of California, Berkeley",
    degree: "B.A. in Data Science",
    period: "Expected 2027",
    details: [
      "Studying data science with strong interests in machine learning, computation, and technical research.",
      "Coursework and independent study have focused on probability, machine learning, data systems, and applied analysis."
    ]
  },

  experience: [
    {
      org: "Berkeley AI Research (BAIR)",
      role: "Research Assistant",
      period: "2026 – Present",
      desc: [
        "Participating in research preparation related to generative modeling and machine learning.",
        "Working through literature, technical discussions, and early-stage research planning.",
        "Building familiarity with problem formulation, implementation, and evaluation in research settings."
      ]
    },
    {
      org: "AMBER pGM CUDA Acceleration Collaboration",
      role: "Research Assistant",
      period: "2025 – Present",
      desc: [
        "Contributing to scientific computing work involving numerical methods, performance-oriented implementation, and research software workflows.",
        "Working with large codebases, testing pipelines, and computation-focused development.",
        "Exploring practical issues around performance, correctness, and reproducibility."
      ]
    },
    {
      org: "Computational Biophysics Research",
      role: "Research Assistant",
      period: "2024 – 2025",
      desc: [
        "Worked on solver-related implementation, GPU-oriented computation, and technical experimentation.",
        "Supported benchmarking, analysis, and engineering tasks for research-oriented projects.",
        "Gained experience connecting scientific problems with practical code and evaluation workflows."
      ]
    }
  ],

  projects: [
    {
      name: "Titanic Predictor",
      desc: "Built a C++ decision-tree pipeline for prediction, feature handling, and model evaluation.",
      stack: ["C++", "Machine Learning", "Data Analysis"],
      link: "https://github.com/xiaole5211314"
    }
  ],

  skills: [
    "Python",
    "C++",
    "Java",
    "MATLAB",
    "PyTorch",
    "TensorFlow",
    "Scikit-learn",
    "Pandas",
    "NumPy",
    "Linux",
    "Git",
    "Docker",
    "CMake",
    "Jupyter",
    "Slurm",
    "SQL",
    "HTML",
    "CSS",
    "React",
    "LaTeX",
    "Regex"
  ]
};

function useReducedMotion() {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefers(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return prefers;
}

function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      className="back-to-top"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  );
}

export default function Portfolio() {
  const reduce = useReducedMotion();

  const floatingShapes = [
    { size: 140, top: "8%", left: "6%", duration: 16, delay: 0 },
    { size: 96, top: "18%", right: "10%", duration: 11, delay: 0.8 },
    { size: 120, bottom: "12%", left: "14%", duration: 14, delay: 0.4 }
  ];

  const fx = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 40 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay }
        };

  return (
    <div className="app">
      <a className="skip-link" href="#about">
        Skip to content
      </a>

      <nav className="navbar">
        <Link to="about" spy smooth duration={500} offset={-70} activeClass="active">
          About
        </Link>
        <Link to="education" spy smooth duration={500} offset={-70} activeClass="active">
          Education
        </Link>
        <Link to="experience" spy smooth duration={500} offset={-70} activeClass="active">
          Experience
        </Link>
        <Link to="projects" spy smooth duration={500} offset={-70} activeClass="active">
          Projects
        </Link>
        <Link to="skills" spy smooth duration={500} offset={-70} activeClass="active">
          Skills
        </Link>
      </nav>

      <header className="header">
        <div className="hero-glow" aria-hidden="true">
          {floatingShapes.map((shape, index) => (
            <motion.span
              key={`shape-${index}`}
              className="glow-shape"
              style={{
                width: shape.size,
                height: shape.size,
                top: shape.top,
                right: shape.right,
                bottom: shape.bottom,
                left: shape.left
              }}
              animate={
                reduce
                  ? {}
                  : {
                      y: [0, -18, 10, 0],
                      x: [0, 10, -8, 0],
                      rotate: [0, 12, -8, 0]
                    }
              }
              transition={
                reduce
                  ? {}
                  : {
                      duration: shape.duration,
                      delay: shape.delay,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut"
                    }
              }
            />
          ))}
        </div>

        <motion.img
          src={data.avatar}
          alt="Kant Wang GitHub avatar"
          {...(reduce
            ? {}
            : {
                initial: { scale: 0.92, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                transition: { duration: 0.65, ease: "easeOut" }
              })}
        />

        <h1>{data.name}</h1>
        <p>{data.title}</p>
        <p className="tagline">{data.tagline}</p>

        <div className="highlights" aria-label="Highlights">
          {data.highlights.map((item, idx) => (
            <motion.div
              key={item.label}
              className="highlight-item"
              whileHover={reduce ? {} : { y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              {...(reduce
                ? {}
                : {
                    initial: { opacity: 0, y: 14 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 0.45, delay: 0.15 + idx * 0.1 }
                  })}
            >
              <span className="highlight-label">{item.label}</span>
              <strong>{item.value}</strong>
            </motion.div>
          ))}
        </div>

        <div className="cta">
          <a className="btn primary" href={`mailto:${data.email}`}>
            Email Me
          </a>
          <a
            className="btn"
            href={data.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            className="btn"
            href={data.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            View GitHub
          </a>
        </div>
      </header>

      <main className="container">
        <motion.section id="about" className="card" {...fx(0)}>
          <h2>About</h2>
          <p>{data.about}</p>
        </motion.section>

        <motion.section id="education" className="card" {...fx(0.1)}>
          <h2>Education</h2>
          <div className="exp">
            <h3>
              {data.education.degree} · {data.education.school}
            </h3>
            <p className="period">{data.education.period}</p>
            <ul>
              {data.education.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.section id="experience" className="card" {...fx(0.2)}>
          <h2>Experience</h2>
          {data.experience.map((exp) => (
            <div key={`${exp.role}-${exp.org}`} className="exp">
              <h3>
                {exp.role} · {exp.org}
              </h3>
              <p className="period">{exp.period}</p>
              <ul>
                {exp.desc.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </motion.section>

        <motion.section id="projects" className="card" {...fx(0.4)}>
          <h2>Projects</h2>
          <div className="grid">
            {data.projects.map((p) => (
              <motion.div
                key={p.name}
                className="project"
                whileHover={reduce ? {} : { scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <h3 className="project-title">{p.name}</h3>
                <p>{p.desc}</p>
                <div className="proj-meta">
                  {p.stack.map((tech) => (
                    <span key={`${p.name}-${tech}`} className="tag">
                      {tech}
                    </span>
                  ))}
                </div>
                <a
                  className="proj-link"
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View project →
                </a>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section id="skills" className="card" {...fx(0.6)}>
          <h2>Skills</h2>
          <div className="tags">
            {data.skills.map((s, idx) => (
              <motion.span
                key={s}
                className="tag"
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 10 },
                      whileInView: { opacity: 1, y: 0 },
                      viewport: { once: true, amount: 0.6 },
                      transition: { duration: 0.3, delay: idx * 0.04 }
                    })}
              >
                {s}
              </motion.span>
            ))}
          </div>
        </motion.section>
      </main>

      <footer className="footer">
        <div>
          <a href={`mailto:${data.email}`}>Email</a> ·{" "}
          <a href={data.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>{" "}
          ·{" "}
          <a href={data.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
        <div>
          © {new Date().getFullYear()} {data.name} · Designed & coded by {data.name}
        </div>
        <div className="last-updated">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}