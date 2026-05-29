import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Migrated off Create React App (react-scripts, deprecated) to Vite.
// - base "/" because the site is served from the apex custom domain
//   kantwang.com (public/CNAME), not a github.io project sub-path.
// - build.outDir "build" so the existing GitHub Actions Pages workflow
//   (.github/workflows/deploy.yml → upload-pages-artifact path: ./build)
//   keeps working untouched. Vite copies public/ verbatim into build/,
//   including CNAME, so the custom domain survives each deploy.
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "build",
  },
});
