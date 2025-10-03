import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-scroll";
import "./styles.css";

const data = {
  name: "Qiankang Wang",
  title: "UC Berkeley · Data Science",
  email: "wangqiankang2022@outlook.com",
  linkedin: "https://linkedin.com/in/qiankang-wang-737b97279",
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
      {/* 顶部导航 */}
      <nav className="navbar">
        <Link to="about" smooth={true} duration={500}>About</Link>
        <Link to="experience" smooth={true} duration={500}>Experience</Link>
        <Link to="projects" smooth={true} duration={500}>Projects</Link>
        <Link to="skills" smooth={true} duration={500}>Skills</Link>
      </nav>

      {/* Header */}
      <header className="header">
        <img src={data.avatar} alt="avatar" />
        <h1>{data.name}</h1>
        <p>{data.title}</p>
        <div className="contact-inline">
          <a href={`mailto:${data.email}`}>{data.email}</a> ·{" "}
          <a href={data.linkedin}>LinkedIn</a>
        </div>
      </header>

      <main className="container">
        {/* About */}
        <motion.section id="about" className="card"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}>
          <h2>About</h2>
          <p>{data.about}</p>
        </motion.section>

        {/* Experience */}
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

        {/* Projects */}
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

        {/* Skills */}
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
        © {new Date().getFullYear()} {data.name} · Built with React ⚛️
      </footer>
    </div>
  );
}
