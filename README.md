# Kant's Portfolio

[![Live Site](https://img.shields.io/badge/Live%20Site-Visit-2563EB?style=flat-square&logo=github)](https://xiaole5211314.github.io/my-portfolio/)

Personal portfolio website showcasing my background in machine learning, scientific computing, and biophysics research. Built with performance and design in mind.

## Live Site

**[xiaole5211314.github.io/my-portfolio](https://xiaole521521314.github.io/my-portfolio/)**

## Features

- **Dynamic Neural Network Background** — Animated canvas visualization on the hero section
- **Typewriter Effect** — Tagline types out character by character on load
- **Scroll Animations** — Sections fade in with staggered timing as you scroll
- **3D Tilt Cards** — Publication and timeline cards respond to mouse movement with 3D perspective
- **Auto-fetched GitHub Projects** — Dynamically pulls your latest repositories via the GitHub API
- **Dark / Light Mode** — Auto-detects system preference with manual toggle; preference persists across sessions
- **Responsive Design** — Fully adapted for mobile, tablet, and desktop
- **Smooth Scroll Navigation** — Click nav links to smoothly scroll to each section
- **Back to Top Button** — Appears after scrolling down

## Sections

| Section | Description |
|---------|-------------|
| **Hero** | Name, avatar, tagline, email / GitHub / LinkedIn links |
| **About** | Bio + animated stat cards |
| **Research** | Timeline of research experiences (BAIR, AMBER, UCI) |
| **Publication** | Paper card with DOI link |
| **Projects** | Auto-fetched GitHub repositories |
| **Skills** | Bento-grid skill cards with hover effects |
| **Contact** | Copy email button + social links |

## Tech Stack

- **React** — UI framework
- **Vite** — Build tool
- **JavaScript** — Core language
- **CSS** — Custom styling with CSS variables for theming
- **GitHub Pages** — Hosting

## Project Structure

```
├── public/
│   └── resume.pdf          # (optional)
├── src/
│   ├── Portfolio.jsx       # Main page component
│   ├── Portfolio.css       # Global styles + theming
│   ├── data.js             # Personal data (name, bio, experience, etc.)
│   └── NeuralNetCanvas.jsx # Hero background animation
├── index.html
├── vite.config.js
└── package.json
```

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deployment

The site is automatically deployed to GitHub Pages on pushes to the `main` branch.

## Contact

- **Email**: qkwang@berkeley.edu
- **GitHub**: [@xiaole5211314](https://github.com/xiaole5211314)
- **LinkedIn**: [Qiankang Wang](https://linkedin.com/in/qiankang-wang-737b97279)
