# Kant's Portfolio

[![Live Site](https://img.shields.io/badge/Live%20Site-Visit-2563EB?style=flat-square&logo=github)](https://kantwang.com/)

Personal portfolio website showcasing my background in machine learning, scientific computing, and biophysics research. Built with performance and design in mind.

## Live Site

**[kantwang.com](https://kantwang.com/)**

## Features

- **Dynamic Neural Network Background** — Animated canvas visualization on the hero section, with RNA/protein motifs and mouse interaction
- **Typewriter Effect** — Tagline types out character by character on load
- **Scroll Animations** — Sections fade in with staggered timing as you scroll
- **3D Tilt Cards** — Publication, timeline, and skill cards respond to mouse movement with 3D perspective
- **Auto-fetched GitHub Projects** — Dynamically pulls my latest repositories via the GitHub API, with a static fallback and per-session caching
- **Responsive Design** — Fully adapted for mobile, tablet, and desktop
- **Reduced-Motion Aware** — Honors `prefers-reduced-motion`: the canvas renders a single static frame and all animation stops
- **Smooth Scroll Navigation** — Click nav links to smoothly scroll to each section
- **Back to Top Button** — Appears after scrolling down

## Sections

| Section | Description |
|---------|-------------|
| **Hero** | Name, avatar, tagline, email / GitHub / LinkedIn links |
| **About** | Bio + animated stat cards + focus highlights |
| **Research** | Timeline of research experiences (Stanford, UC Irvine) |
| **Publication** | Paper card linking to the DOI |
| **Projects** | Auto-fetched GitHub repositories |
| **Skills** | Bento-grid skill cards with hover effects |

## Tech Stack

- **React 19** — UI framework
- **Vite** — Build tooling and dev server
- **JavaScript** — Core language
- **CSS** — Custom styling with CSS variables for theming
- **GitHub Pages** — Hosting (deployed via GitHub Actions)

## Project Structure

```
├── index.html              # Vite entry — HTML template + meta/SEO tags
├── vite.config.js          # Vite build config (base, outDir: build/)
├── public/                 # Static assets copied verbatim into build/
│   ├── CNAME               # Custom domain (kantwang.com)
│   ├── manifest.json       # PWA manifest
│   ├── sitemap.xml         # Sitemap for crawlers
│   └── icon.png            # K logo / favicon
├── src/
│   ├── index.jsx           # React entry point
│   ├── ErrorBoundary.jsx   # Top-level error boundary + static fallback
│   ├── Portfolio.jsx       # Main page component
│   ├── Portfolio.css       # Global styles + theming
│   ├── data.js             # Personal data (name, bio, experience, etc.)
│   └── NeuralNetCanvas.jsx # Hero background animation
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages deployment workflow
└── package.json
```

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm start

# Build for production
npm run build
```

## Deployment

The site is automatically built and deployed to GitHub Pages on every push to the `main` branch via the GitHub Actions workflow in `.github/workflows/deploy.yml`.

## Contact

- **Email**: qkwang@berkeley.edu
- **GitHub**: [@qiankangwang](https://github.com/qiankangwang)
- **LinkedIn**: [Qiankang Wang](https://linkedin.com/in/qiankang-wang-737b97279)
