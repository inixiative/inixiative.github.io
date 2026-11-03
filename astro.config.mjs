import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.inixiative.com",
  trailingSlash: "ignore",
  build: { format: "directory" },
  // web (3000) + 100 × block 8, the next free block in @inixiative/config ports.json (registry entry pending).
  server: { port: 3800 },
  // GitHub Pages can't send a 301; Astro writes a meta-refresh page for each of these.
  redirects: {
    "/aron": "/",
    "/demos/lenses": "/building-blocks/",
  },
});
