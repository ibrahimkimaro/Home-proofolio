/**
 * Build the layered hero for the landing pages from one photo of the desk.
 *
 * In:   home_profio_frontend/public/images/hero-desk/source.jpg
 * Out:  plate.jpg   the photo with the phone and the watch removed (the gap is filled from the
 *                   surrounding pixels, so a few pixels of it can show while the devices float)
 *       phone.png   the phone, cut out with a soft edge
 *       watch.png   the watch, cut out with a soft edge
 *       layout.json where each cut-out sits, as percentages of the plate
 *
 * The outlines are hand-traced polygons in source-pixel coordinates. If the photo is replaced,
 * re-trace them (overlay the polygon on a zoomed crop and adjust) and run this again.
 *
 * Usage: node tools/build_hero_desk.mjs
 */

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.join(root, "home_profio_frontend");
const sharp = createRequire(path.join(frontend, "package.json"))("sharp");
const dir = path.join(frontend, "public", "images", "hero-desk");

const SCALE = 3; // the source is 1024px wide: upscale it here, once, instead of leaving the browser to stretch it
const GROW = 1.5; // cut-outs reach this far (output px) past the traced outline, so no edge is left behind
const FEATHER = 1.6; // soft edge width (output px)
const FILL_MARGIN = 3; // the plate is filled this far past the cut-out edge

const OUTLINES = {
  phone: [[33, 203], [37, 199.5], [44, 198.5], [97, 195], [101, 196.5], [104, 200.5], [122, 250], [138, 300], [147, 337], [147, 342], [144.5, 346], [88, 356.5], [83, 356], [79.5, 352.5], [64, 300], [40, 240], [31.5, 209]],
  watch: [[454, 339], [457, 336.5], [482, 336.5], [485, 339], [486, 353], [491, 355], [495, 359], [496.5, 410], [493, 416], [487, 418], [487, 434], [484, 436.5], [454, 436.5], [451, 434], [451, 418], [446, 416], [442.5, 411], [442.5, 360], [445, 355], [452, 353]],
};

/** Signed distance from (x, y) to a polygon: negative inside. */
function signedDistance(poly, x, y) {
  let inside = false;
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    const dx = xj - xi;
    const dy = yj - yi;
    const t = Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - (xi + t * dx), y - (yi + t * dy)));
  }
  return inside ? -best : best;
}

/** Fill the masked pixels from their neighbours: peel inward from the edge, then smooth. */
function fillHoles(rgb, w, h, hole) {
  const known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) known[i] = hole[i] ? 0 : 1;
  let pending = hole.reduce((n, v) => n + v, 0);
  while (pending > 0) {
    const ring = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (known[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const k = yy * w + xx;
            if (!known[k]) continue;
            r += rgb[k * 3]; g += rgb[k * 3 + 1]; b += rgb[k * 3 + 2]; n++;
          }
        if (n >= 2) ring.push([i, r / n, g / n, b / n]);
      }
    if (!ring.length) break;
    for (const [i, r, g, b] of ring) {
      rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
      known[i] = 1;
    }
    pending -= ring.length;
  }
  // a few relaxation passes so the peel doesn't leave streaks
  const idx = [];
  for (let i = 0; i < w * h; i++) if (hole[i]) idx.push(i);
  for (let pass = 0; pass < 120; pass++)
    for (const i of idx) {
      const x = i % w, y = (i - x) / w;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
      for (let c = 0; c < 3; c++)
        rgb[i * 3 + c] = (rgb[(i - 1) * 3 + c] + rgb[(i + 1) * 3 + c] + rgb[(i - w) * 3 + c] + rgb[(i + w) * 3 + c]) / 4;
    }
  // the photo has grain; a flat fill would read as a smudge
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  for (const i of idx) {
    const n = rand() * 6;
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.max(0, Math.min(255, rgb[i * 3 + c] + n));
  }
}

const meta = await sharp(path.join(dir, "source.jpg")).metadata();
const W = meta.width * SCALE;
const H = meta.height * SCALE;
// Enhance once, before the cut-outs are taken, so the plate and the floating devices match:
// light denoise (kills JPEG blocking), upscale, local contrast, then two sharpening passes
// (fine detail, then edge definition). Film grain goes on last so the upscale doesn't read as plastic.
const { data } = await sharp(path.join(dir, "source.jpg"))
  .median(3)
  .resize(W, H, { kernel: "lanczos3" })
  .clahe({ width: Math.round(W / 8), height: Math.round(H / 8), maxSlope: 2 })
  .modulate({ saturation: 1.06 })
  .sharpen({ sigma: 1.1, m1: 0.6, m2: 1.4 })
  .sharpen({ sigma: 2.4, m1: 0.3, m2: 0.7 })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const original = new Uint8Array(data);
{
  let g = 12345;
  const rnd = () => (g = (g * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < W * H; i++) {
    const n = (rnd() + rnd() - 1) * 5;
    const lum = (original[i * 3] + original[i * 3 + 1] + original[i * 3 + 2]) / 765;
    const k = n * (0.5 + 0.9 * (1 - lum)); // grain shows most in the shadows, like a real sensor
    for (let c = 0; c < 3; c++) original[i * 3 + c] = Math.max(0, Math.min(255, original[i * 3 + c] + k));
  }
}
const plate = new Float32Array(original);
const layout = { width: W, height: H };

for (const [name, outline] of Object.entries(OUTLINES)) {
  const poly = outline.map(([x, y]) => [x * SCALE, y * SCALE]);
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const pad = Math.ceil(GROW + FEATHER + FILL_MARGIN + 2);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)) - pad);
  const y0 = Math.max(0, Math.floor(Math.min(...ys)) - pad);
  const x1 = Math.min(W, Math.ceil(Math.max(...xs)) + pad);
  const y1 = Math.min(H, Math.ceil(Math.max(...ys)) + pad);
  const bw = x1 - x0;
  const bh = y1 - y0;

  const cut = Buffer.alloc(bw * bh * 4);
  const hole = new Uint8Array(W * H);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const d = signedDistance(poly, x + 0.5, y + 0.5);
      const a = Math.max(0, Math.min(1, (GROW - d) / FEATHER + 0.5));
      const o = ((y - y0) * bw + (x - x0)) * 4;
      const s = (y * W + x) * 3;
      cut[o] = original[s]; cut[o + 1] = original[s + 1]; cut[o + 2] = original[s + 2];
      cut[o + 3] = Math.round(a * 255);
      if (d < GROW + FILL_MARGIN) hole[y * W + x] = 1;
    }
  fillHoles(plate, W, H, hole);

  await sharp(cut, { raw: { width: bw, height: bh, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(dir, `${name}.png`));
  const pct = (v, of) => +((v / of) * 100).toFixed(3);
  layout[name] = { left: pct(x0, W), top: pct(y0, H), width: pct(bw, W), height: pct(bh, H) };
  console.log(name, layout[name]);
}

await sharp(Buffer.from(Uint8Array.from(plate, (v) => Math.round(v))), { raw: { width: W, height: H, channels: 3 } })
  .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" })
  .toFile(path.join(dir, "plate.jpg"));
const layoutJson = JSON.stringify(layout, null, 2) + "\n";
writeFileSync(path.join(dir, "layout.json"), layoutJson);
// the hero component imports this copy, so its boxes can never drift from the images
writeFileSync(path.join(frontend, "src", "components", "landing", "hero-desk-layout.json"), layoutJson);
console.log("wrote", dir);
