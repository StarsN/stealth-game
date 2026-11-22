// Quiet Hours — the museum wing. One ASCII map, 32x18 tiles at 40px:
//   # wall   . floor   C display case (cover, blocks sight and movement)
//   P pillar (cover)   A artifact   E exit   S player spawn
// The two divider walls split the wing into three rooms; rows 5 and 12 are
// open corridors between them, so the player can always flank a patrol.
import { COLS, ROWS, TILE } from './config.js';

const MAP = [
  '################################',
  '#.........#..........#.........#',
  '#..A......#....P.....#.....A...#',
  '#...CC....#..CC......#..CC.....#',
  '#.....P...#.......P..#....P....#',
  '#..........CC..........CC......#',
  '#.........#..........#.........#',
  '#..P......#....CC....#.........#',
  '#.........#..........#.........#',
  '#...CC....#..P.......#..P......#',
  '#.........#..........#.........#',
  '#.........#....CC....#....P....#',
  '#..............................#',
  '#.....P...#..P.......#..CC.....#',
  '#.........#..........#.........#',
  '#..S......#....A.....#.....E...#',
  '#.........#..........#.........#',
  '################################',
];

export const GUARDS = [
  {
    name: 'Mara',
    waypoints: [
      { tx: 2, ty: 8 },
      { tx: 8, ty: 8 },
      { tx: 8, ty: 10 },
      { tx: 2, ty: 10 },
    ],
  },
  {
    name: 'Odo',
    waypoints: [
      { tx: 12, ty: 6 },
      { tx: 19, ty: 6 },
      { tx: 19, ty: 12 },
      { tx: 12, ty: 12 },
    ],
  },
  {
    name: 'Ilsa',
    waypoints: [
      { tx: 23, ty: 6 },
      { tx: 29, ty: 6 },
      { tx: 29, ty: 12 },
      { tx: 23, ty: 12 },
    ],
  },
];

// Parse the map once. Throws loudly on a malformed row so a typo can never
// ship as a silently broken level.
function parseMap() {
  if (MAP.length !== ROWS) throw new Error(`map has ${MAP.length} rows, expected ${ROWS}`);
  const walls = new Set();
  const cases = [];
  const pillars = [];
  const artifacts = [];
  let exit = null;
  let spawn = null;
  MAP.forEach((row, ty) => {
    if (row.length !== COLS) throw new Error(`map row ${ty} is ${row.length} chars, expected ${COLS}`);
    for (let tx = 0; tx < COLS; tx++) {
      const ch = row[tx];
      const key = `${tx},${ty}`;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') cases.push({ tx, ty });
      else if (ch === 'P') pillars.push({ tx, ty });
      else if (ch === 'A') artifacts.push({ tx, ty, taken: false });
      else if (ch === 'E') exit = { tx, ty };
      else if (ch === 'S') spawn = { tx, ty };
      else if (ch !== '.') throw new Error(`map row ${ty} col ${tx}: unknown tile '${ch}'`);
    }
  });
  if (!exit) throw new Error('map has no exit');
  if (!spawn) throw new Error('map has no spawn');
  if (artifacts.length !== 3) throw new Error(`map has ${artifacts.length} artifacts, expected 3`);
  return { walls, cases, pillars, artifacts, exit, spawn };
}

export const LEVEL = parseMap();

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

// A tile blocks movement and sight when it is a wall, a case or a pillar.
export function isBlockingTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return LEVEL.walls.has(`${tx},${ty}`) || MAP[ty][tx] === 'C' || MAP[ty][tx] === 'P';
}

// Circle-vs-tile collision: can a circle of radius r sit at (x, y)?
export function circleFits(x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isBlockingTile(tx, ty)) continue;
      // Closest point on the tile to the circle centre.
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < r * r) return false;
    }
  }
  return true;
}
