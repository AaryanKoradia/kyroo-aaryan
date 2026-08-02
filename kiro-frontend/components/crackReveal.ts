// Shared "shatter" wipe reveal: many jagged, irregularly-sized shards
// scattered across the whole element, each growing from its own center
// out to its final torn-edge shape on its own staggered timer - not one
// wipe sweeping from a single corner. Used both for the one-time load-in
// animation and for the scroll-scrubbed transitions between journey
// slides, matching the reference clip's own load-in.
//
// Deterministic (seeded RNG, no Math.random()) so server and client
// render the identical shard geometry - otherwise Next's hydration would
// see a mismatch between the prerendered HTML and the client's first paint.

type Pt = [number, number];
type Shard = { points: Pt[]; cx: number; cy: number; phase: number };

function mulberry32(seed: number) {
  return function random() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function irregularSplit(rand: () => number, n: number, total: number): number[] {
  // random weights -> some cells end up noticeably bigger/smaller than
  // others, instead of a perfectly even grid
  const weights = Array.from({ length: n }, () => 0.55 + rand() * 0.9);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (w / sum) * total);
}

function buildShards(seed: number, cols: number, rows: number): Shard[] {
  const rand = mulberry32(seed);
  const colW = irregularSplit(rand, cols, 100);
  const rowH = irregularSplit(rand, rows, 100);

  const shards: Shard[] = [];
  let y = 0;
  for (let r = 0; r < rows; r++) {
    let x = 0;
    for (let c = 0; c < cols; c++) {
      const w = colW[c], h = rowH[r];
      const jx = w * 0.35, jy = h * 0.35;
      // 4 corners of this cell, each jittered so the shared edge with a
      // neighboring shard is torn/irregular rather than a straight grid line
      const points: Pt[] = [
        [x - jx * rand(), y - jy * rand()],
        [x + w + jx * rand(), y - jy * rand()],
        [x + w + jx * rand(), y + h + jy * rand()],
        [x - jx * rand(), y + h + jy * rand()],
      ];
      const cx = points.reduce((s, p) => s + p[0], 0) / 4;
      const cy = points.reduce((s, p) => s + p[1], 0) / 4;
      // staggered start so shards don't all grow in lockstep - every
      // shard still reaches full size by t=1 regardless of its phase
      const phase = rand() * 0.6;
      shards.push({ points, cx, cy, phase });
      x += w;
    }
    y += rowH[r];
  }
  return shards;
}

// irregular grid (7x5 base cells, further split unevenly) so shard sizes
// genuinely vary - some big panes, some small slivers, scattered evenly
// across the whole viewport rather than emanating from one corner
const SHARDS = buildShards(1337, 7, 5);

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// t=0 -> nothing revealed (every shard collapsed to its own center point),
// t=1 -> fully covers a `width` x `height` box. Coordinates are px, not %,
// because CSS clip-path: path() doesn't support percentage units.
export function shatterClipPath(t: number, width: number, height: number): string {
  const subpaths = SHARDS.map((s) => {
    const local = Math.max(0, Math.min(1, (t - s.phase) / (1 - s.phase)));
    const pts = s.points.map(([px, py]) => {
      const x = (lerp(s.cx, px, local) / 100) * width;
      const y = (lerp(s.cy, py, local) / 100) * height;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} Z`;
  });
  return `path('${subpaths.join(" ")}')`;
}

export function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
export function lerpColor(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
}
