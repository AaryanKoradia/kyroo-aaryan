// Shared "crack/shatter" wipe reveal: a jagged, low-poly frontier that
// sweeps in from the right edge to cover the full element. Used both for
// the one-time load-in animation and for the scroll-scrubbed transitions
// between journey slides, so the same signature motion shows up in both
// places, matching the reference clip's page-load wipe.
//
// The polygon is built from N "frontier" points at FIXED y positions
// spanning the full height (0% to 100%) - so vertical coverage is always
// complete, never something that has to catch up - each sweeping its own
// x from 100% (closed/invisible) to well past the left edge (open/full
// bleed). Each point starts sweeping at its own small phase offset, so
// they don't move in lockstep: that's what makes the boundary look
// jagged/crystalline mid-transition instead of a flat vertical wipe.
const FRONTIER_Y = [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
const PHASE = [0, 0.22, 0.06, 0.3, 0.02, 0.26, 0.1, 0.34, 0.14];
const CLOSED_X = 100;
const OPEN_X = -20; // past the left edge, so full coverage has margin to spare

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// t=0 -> fully closed (an invisible sliver at the right edge), t=1 -> fully open (covers the whole element)
export function crackClipPath(t: number): string {
  const frontier = FRONTIER_Y.map((y, i) => {
    const local = Math.max(0, Math.min(1, (t - PHASE[i]) / (1 - PHASE[i])));
    const x = lerp(CLOSED_X, OPEN_X, local);
    return `${x}% ${y}%`;
  });
  // close the loop via two points pinned safely off-screen past the right
  // edge, so the closing edge never cuts back through the visible area
  const closing = [`110% 100%`, `110% 0%`];
  return `polygon(${[...frontier, ...closing].join(", ")})`;
}
