import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-scroll";
import "./styles.css";

const data = {
  name: "Kant(Qiankang) Wang",
  title: "Data Science Student @ UC Berkeley",
  email: "wangqiankang2022@outlook.com",
  linkedin: "https://linkedin.com/in/qiankang-wang-737b97279",
  github: "https://github.com/xiaole5211314",
  avatar: "https://github.com/xiaole5211314.png",
  about:
    "Hi, I'm Qiankang, a data science undergraduate at UC Berkeley. I enjoy working at the intersection of data, algorithms, and high-performance computing. Outside of class, I spend time building and testing solvers, creating automation pipelines, and exploring research projects.",
  experience: [
    {
      org: "Computational Biophysics Lab, UC Irvine",
      role: "Undergraduate Researcher",
      period: "Jul 2024 – Present",
      desc: [
        "Rebuilt and tested PB solver algorithms (CG, BiCG) in LibTorch.",
        "Automated 1M+ runs with Slurm pipelines on the cluster.",
        "Analyzed results with Python and produced figures for research papers."
      ]
    }
  ],
  projects: [
    { name: "Titanic Predictor", desc: "Decision tree in C++ on Titanic dataset." },
    { name: "Fuel-Efficiency Classifier", desc: "CNN model served on a Django web app for quick car image prediction." }
  ],
  skills: ["Python", "C++", "PyTorch", "TensorFlow", "Slurm", "Git", "Docker"]
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
      <a className="skip-link" href="#about">Skip to content</a>

      <nav className="navbar">
        <Link to="about" spy smooth duration={500} offset={-70} activeClass="active">About</Link>
        <Link to="experience" spy smooth duration={500} offset={-70} activeClass="active">Experience</Link>
        <Link to="projects" spy smooth duration={500} offset={-70} activeClass="active">Projects</Link>
        <Link to="skills" spy smooth duration={500} offset={-70} activeClass="active">Skills</Link>
      </nav>

      <header className="header">
        <img src={data.avatar} alt="Qiankang Wang GitHub avatar" />
        <h1>{data.name}</h1>
        <p>{data.title}</p>

        <div className="cta">
          <a className="btn primary" href={`mailto:${data.email}`}>Email Me</a>
          <a className="btn" href={data.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a className="btn" href={data.github} target="_blank" rel="noopener noreferrer">View GitHub</a>
        </div>
      </header>

      <main className="container">
        <motion.section id="about" className="card" {...fx(0)}>
          <h2>About</h2>
          <p>{data.about}</p>
        </motion.section>

        <motion.section id="experience" className="card" {...fx(0.2)}>
          <h2>Experience</h2>
          {data.experience.map((exp, i) => (
            <div key={i} className="exp">
              <h3>{exp.role} · {exp.org}</h3>
              <p className="period">{exp.period}</p>
              <ul>
                {exp.desc.map((line, j) => <li key={j}>{line}</li>)}
              </ul>
            </div>
          ))}
        </motion.section>

        <motion.section id="projects" className="card" {...fx(0.4)}>
          <h2>Projects</h2>
          <div className="grid">
            {data.projects.map((p, i) => (
              <motion.div
                key={i}
                className="project"
                whileHover={reduce ? {} : { scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <h3>{p.name}</h3>
                <p>{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section id="skills" className="card" {...fx(0.6)}>
          <h2>Skills</h2>
          <div className="tags">
            {data.skills.map((s) => (
              <span key={s} className="tag">{s}</span>
            ))}
          </div>
        </motion.section>
      </main>

      <footer className="footer">
        <div>
          <a href={`mailto:${data.email}`}>Email</a> ·{" "}
          <a href={data.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a> ·{" "}
          <a href={data.github} target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <div>© {new Date().getFullYear()} {data.name} · Designed & Coded by {data.name}</div>
        <div className="last-updated">Last updated: {new Date().toISOString().slice(0, 10)}</div>
      </footer>

      <BackToTop />
    </div>
  );
}
