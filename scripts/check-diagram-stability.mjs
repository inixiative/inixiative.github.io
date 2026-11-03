// Run against a served build (needs Playwright, not a site dependency): bun scripts/check-diagram-stability.mjs http://127.0.0.1:<port>
// Hover and keyboard-focus pieces on every interactive diagram; nothing may move.
import { chromium } from 'playwright';
const base = process.argv[2];
const pages = ['/', '/building-blocks/', '/agentic/', '/building-blocks/technical/', '/agentic/technical/', '/vocabulary/'];
const b = await chromium.launch();
let failures = 0;
const rows = [];
for (const w of [1440, 390]) {
  for (const path of pages) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: false });
    });
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(path.includes('vocab') ? 2500 : 2200);
    const fig = await p.$('figure.stack-map');
    const visible = fig && (await p.evaluate((f) => getComputedStyle(f.querySelector('.map-canvas')).display !== 'none', fig));
    if (!visible) { rows.push(`${w} ${path}: map drawing hidden at this width (slabs only), skipped`); await p.close(); continue; }
    await fig.scrollIntoViewIfNeeded();
    await p.waitForTimeout(300);
    await p.evaluate(() => { window.__cls = 0; });
    const ids = await p.$$eval('figure.stack-map .map-svg .node', (ns) => ns.map((n) => n.dataset.id));
    const pick = [...new Set([ids[0], ids[1], ids[Math.floor(ids.length / 2)], ids[ids.length - 2], ids[ids.length - 1]])];
    const snap = (id) => p.evaluate((id) => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 2) / 2); };
      const fig = document.querySelector('figure.stack-map');
      const node = fig.querySelector(`.map-svg .node[data-id="${id}"]`);
      return { node: r(node), fig: r(fig), prev: r(fig.previousElementSibling), next: r(fig.nextElementSibling), y: window.scrollY };
    }, id);
    let worst = 0;
    for (const id of pick) {
      for (const mode of ['hover', 'focus']) {
        const sel = `figure.stack-map .map-svg .node[data-id="${id}"]`;
        // Bring the piece into view first, so the hover's own scroll-into-view is not counted as movement.
        await p.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
        await p.waitForTimeout(200);
        const before = await snap(id);
        if (mode === 'hover') await p.hover(sel, { force: true });
        else await p.evaluate((s) => document.querySelector(s).focus({ preventScroll: true }), sel);
        await p.waitForTimeout(260);
        const during = await snap(id);
        const d = (a, c) => (a && c ? Math.max(...a.map((v, i) => Math.abs(v - c[i]))) : 0);
        const delta = Math.max(d(before.node, during.node), d(before.fig, during.fig), d(before.prev, during.prev), d(before.next, during.next), Math.abs(before.y - during.y));
        worst = Math.max(worst, delta);
        if (delta > 0.5) { failures++; rows.push(`FAIL ${w} ${path} ${mode} ${id}: moved ${delta}px`); }
        await p.mouse.move(2, 2);
        await p.evaluate(() => document.activeElement && document.activeElement.blur());
      }
    }
    const cls = await p.evaluate(() => window.__cls);
    if (cls > 0) { failures++; rows.push(`FAIL ${w} ${path}: layout shift ${cls}`); }
    rows.push(`${w} ${path}: ${pick.length} pieces x hover+focus, max movement ${worst}px, layout shift ${cls}`);
    await p.close();
  }
}
console.log(rows.join('\n'));
console.log(failures ? `${failures} failures` : 'all stable');
await b.close();
process.exit(failures ? 1 : 0);
