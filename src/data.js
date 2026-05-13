const D = {
  name: "Qiankang Wang",
  fullName: "Qiankang (Kant) Wang",
  email: "qkwang@berkeley.edu",
  linkedin: "https://linkedin.com/in/qiankang-wang-737b97279",
  github: "https://github.com/xiaole5211314",
  avatar: "https://github.com/xiaole5211314.png",

  tagline:
    "Machine learning for biology — representation learning, generative modeling, and scientific computing.",

  focuses: ["Representation Learning", "Generative Models", "Scientific Computing", "Open to Research"],

  about:
    "Undergraduate at UC Berkeley studying Data Science. I work at the intersection of modern machine learning and biophysics, with interests in representation learning, scientific software, and reliable computing for biological data.",

  stats: [
    { n: "ML", l: "Scientific Data" },
    { n: "HPC", l: "Research Compute" },
    { n: "2026", l: "JCTC Paper" },
  ],

  experience: [
    {
      org: "Berkeley AI Research (BAIR)",
      role: "Research Assistant",
      period: "Mar 2026 — Present",
      tag: "self-supervised learning",
      desc: "Self-supervised representation learning on scientific data, building on SimCLR-style contrastive frameworks.",
    },
    {
      org: "AMBER pGM Collaboration",
      role: "Research Assistant",
      period: "Nov 2025 — Mar 2026",
      tag: "scientific software",
      desc: "Acceleration project for the AMBER / PMEMD codebase — code integration, regression testing, and numerical-consistency analysis.",
    },
    {
      org: "Computational Biophysics Lab · UC Irvine",
      role: "Research Assistant",
      period: "Jul 2024 — Nov 2025",
      tag: "GPU scientific computing",
      desc: "Worked on GPU-accelerated solver and Slurm workflow infrastructure for PBSA-style biomolecular simulation workloads.",
    },
  ],

  publication: {
    authors: "Wu, Y., Wang, Q., et al.",
    title:
      "AmberTorchPB: A Unified Framework for Poisson–Boltzmann-Based Reaction Field Energy Calculation via Tensor Computation",
    venue: "Journal of Chemical Theory and Computation",
    year: "2026",
    role: "Second author",
    links: [
      { label: "DOI", url: "https://pubs.acs.org/doi/pdf/10.1021/acs.jctc.6c00085" },
    ],
  },

  projects: [
    {
      id: "fallback-1",
      name: "simclr-cifar10-pytorch",
      description: "SimCLR-style self-supervised learning on CIFAR-10 with ResNet-18 and k-NN evaluation.",
      language: "Python",
      stargazers_count: 1,
      html_url: "https://github.com/xiaole5211314/simclr-cifar10-pytorch",
    },
    {
      id: "fallback-2",
      name: "regal",
      description: "AI legal operations platform with real-time deposition transcription and intelligent assistance.",
      language: "TypeScript",
      stargazers_count: 0,
      html_url: "https://github.com/xiaole5211314/regal",
    },
    {
      id: "fallback-3",
      name: "Decision-Tree",
      description: "From-scratch C++ decision tree classifier with Gini impurity on the Titanic dataset.",
      language: "C++",
      stargazers_count: 0,
      html_url: "https://github.com/xiaole5211314/Decision-Tree",
    },
  ],

  skills: {
    "Machine Learning": [
      "PyTorch", "LibTorch", "Contrastive / SSL", "Diffusion models", "Transformers",
    ],
    "Scientific Computing": [
      "GPU optimization", "CG / BiCG solvers", "Poisson–Boltzmann / PBSA", "Molecular simulation",
    ],
    Languages: ["Python", "C++", "Bash", "SQL"],
    Tools: ["Linux", "Git", "Slurm", "CMake", "LaTeX"],
  },
};

export default D;
