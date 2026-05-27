const D = {
  name: "Qiankang Wang",
  fullName: "Qiankang (Kant) Wang",
  email: "qkwang@berkeley.edu",
  linkedin: "https://linkedin.com/in/qiankang-wang-737b97279",
  github: "https://github.com/qiankangwang",
  avatar: "https://github.com/qiankangwang.png",

  tagline:
    "Machine learning for biology — representation learning, foundation models, and scientific computing.",

  focuses: ["Representation Learning", "Foundation Models", "Scientific Computing", "Open to Research"],

  about:
    "Undergraduate at UC Berkeley studying Data Science. I work at the intersection of modern machine learning and biophysics, with interests in representation learning, foundation models, and scientific computing for biological data.",

  stats: [
    { n: "ML", l: "Scientific Data" },
    { n: "HPC", l: "Research Compute" },
    { n: "2026", l: "JCTC Paper" },
  ],

  experience: [
    {
      org: "Stanford University",
      role: "Research Assistant",
      period: "Mar 2026 — Present",
      tag: "",
      desc: "",
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
      html_url: "https://github.com/qiankangwang/simclr-cifar10-pytorch",
    },
    {
      id: "fallback-2",
      name: "regal",
      description: "AI legal operations platform with real-time deposition transcription and intelligent assistance.",
      language: "TypeScript",
      stargazers_count: 0,
      html_url: "https://github.com/qiankangwang/regal",
    },
    {
      id: "fallback-3",
      name: "Decision-Tree",
      description: "From-scratch C++ decision tree classifier with Gini impurity on the Titanic dataset.",
      language: "C++",
      stargazers_count: 0,
      html_url: "https://github.com/qiankangwang/Decision-Tree",
    },
  ],

  skills: {
    "Machine Learning": [
      "PyTorch", "LibTorch", "Contrastive / SSL", "Foundation models", "Transformers",
    ],
    "Scientific Computing": [
      "GPU optimization", "CG / BiCG solvers", "Poisson–Boltzmann / PBSA", "Molecular simulation",
    ],
    Languages: ["Python", "C++", "Bash", "SQL"],
    Tools: ["Linux", "Git", "Slurm", "CMake", "LaTeX"],
  },
};

export default D;
