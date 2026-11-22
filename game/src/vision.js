// Quiet Hours — sight. Everything a guard can or cannot see runs through here:
// a straight segment is clear when no sample along it lands inside a blocking
// tile, and a vision cone is the fan of rays a guard sweeps, each ray stopped
// by the first blocking tile it meets.
import { CONE_HALF_ANGLE, CONE_RANGE, CONE_RAYS, TILE } from './config.js';
import { isBlockingTile } from './level.js';

function pointBlocked(x, y) {
  return isBlockingTile(Math.floor(x / TILE), Math.floor(y / TILE));
}

// True when the straight line from (x0, y0) to (x1, y1) never crosses a
// blocking tile. Samples every 5px, which is finer than the 40px tiles.
export function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true;
  const steps = Math.max(1, Math.ceil(dist / 5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointBlocked(x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

// Cast one ray from (x, y) along angle until it hits a blocking tile or the
// range runs out; returns the endpoint.
function castRay(x, y, angle, range) {
  const step = 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let px = x;
  let py = y;
  for (let d = step; d <= range; d += step) {
    const nx = x + cos * d;
    const ny = y + sin * d;
    if (pointBlocked(nx, ny)) return { x: px, y: py };
    px = nx;
    py = ny;
  }
  return { x: x + cos * range, y: y + sin * range };
}

// The visible fan of a guard standing at (x, y) facing `angle`: a polygon of
// ray endpoints. Walls and cases carve notches out of it, which is what makes
// hiding behind cover actually work.
export function conePolygon(x, y, angle, range = CONE_RANGE) {
  const points = [{ x, y }];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = angle - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / CONE_RAYS;
    points.push(castRay(x, y, a, range));
  }
  return points;
}

// Is the point (px, py) inside a guard's cone and in line of sight?
// Returns 0 when unseen, otherwise a 0..1 closeness (1 = right on top of the
// guard) that the detection meter fills with.
export function coneSees(gx, gy, angle, px, py) {
  const dx = px - gx;
  const dy = py - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return 0;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(gx, gy, px, py)) return 0;
  return 1 - dist / CONE_RANGE;
}
