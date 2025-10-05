import React from "react";
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
    {
      name: "Titanic Predictor",
      desc: "Decision tree in C++ on Titanic dataset."
    },
    {
      name: "Fuel-Efficiency Classifier",
      desc: "CNN model served on a Django web app for quick car image prediction."
    }
  ],
  skills: ["Python", "C++", "PyTorch", "TensorFlow", "Slurm", "Git", "Docker"]
};

export default function Portfolio() {
  return (
    <div className="app">
      <nav className="navbar">
        <Link to="about" smooth={true} duration={500}>About</Link>
        <Link to="experience" smooth={true} duration={500}>Experience</Link>
        <Link to="projects" smooth={true} duration={500}>Projects</Link>
        <Link to="skills" smooth={true} duration={500}>Skills</Link>
      </nav>

      <header className="header">
        <img src={data.avatar} alt="avatar" />
        <h1>{data.name}</h1>
        <p>{data.title}</p>
        <div className="contact-inline">
          <a href={`mailto:${data.email}`}>{data.email}</a> ·{" "}
          <a href={data.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a> ·{" "}
          <a href={data.github} target="_blank" rel="noopener noreferrer" className="gh-link">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" style={{ verticalAlign: "-2px", marginRight: 6 }}>
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
              1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
              0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09
              2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65
              3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>
            </svg>
            GitHub
          </a>
        </div>
      </header>

      <main className="container">
        <motion.section id="about" className="card"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}>
          <h2>About</h2>
          <p>{data.about}</p>
        </motion.section>

        <motion.section id="experience" className="card"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}>
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

        <motion.section id="projects" className="card"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}>
          <h2>Projects</h2>
          <div className="grid">
            {data.projects.map((p, i) => (
              <motion.div key={i} className="project"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300 }}>
                <h3>{p.name}</h3>
                <p>{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section id="skills" className="card"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}>
          <h2>Skills</h2>
          <div className="tags">
            {data.skills.map((s) => (
              <span key={s} className="tag">{s}</span>
            ))}
          </div>
        </motion.section>
      </main>

      <footer className="footer">
        <div>© {new Date().getFullYear()} {data.name}</div>
      </footer>
    </div>
  );
}
