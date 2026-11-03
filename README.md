# www.inixiative.com

Astro, built and deployed to GitHub Pages by `.github/workflows/pages.yml`.

```bash
bun install
bun run dev      # http://localhost:3800
bun run check    # build + scripts/check-dist.mjs (links, anchors, Pages hazards)
```

- **Theme:** `@inixiative/config/theme` (`public.css`, `domains.css`, `marketing.css`, fonts). `scripts/prepare-static.mjs` copies it from `node_modules` to `public/theme/` on every build, so the theme's version is whatever `package.json` pins. Don't copy theme CSS into this repo; page-only layout lives in `src/styles/site.css`.
- **Long-form pages** (`proposals/`, `moving-forward/`) are hand-written HTML served as-is, copied in by the same script. They stay at these paths so chapter PRs apply cleanly. Their look comes from `proposals/style.css`, which maps the chapters' own variable names onto theme tokens.
- **Pages hazards:** `/rules-builder/` is served by the rules-builder repo's own Pages under this domain; this site must never emit it (the check fails if it does). Never enable Pages on a repo whose name is a route here (`foundry`, `agentic`, `governance`, …): it would take over that path. Pages can't send redirects; moved paths are Astro `redirects` (meta refresh) or stub files in `public/`. The `/#<repo>` anchors that repo homepages link to are redirected by a script on `/`.
- **Pages source:** GitHub Actions (`build_type=workflow`), switched from the legacy branch build of `main /` before #8 merged. Don't switch it back: the legacy build would publish the raw repo (no `index.html` at the root, `CNAME` moved to `public/`). After any Pages settings change, confirm `cname` is `www.inixiative.com` and `/rules-builder/` still answers.
- **Preview card:** `public/og-1200x630.png` is rendered from `scripts/og-card.html` (command in that file).
