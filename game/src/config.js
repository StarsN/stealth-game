// Quiet Hours — tuning constants. One place for every number the game balances on,
// so the level, the guards and the player all read the same truth.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 720

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_RUN_SPEED = 232;
export const PLAYER_SNEAK_SPEED = 84;
export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 72;
export const GUARD_CHASE_SPEED = 168;
export const GUARD_SEARCH_SPEED = 110;

export const CONE_RANGE = 185;
export const CONE_HALF_ANGLE = (35 * Math.PI) / 180;
export const CONE_RAYS = 26;
export const DETECT_FILL_CLOSE = 1.25; // per second at point blank
export const DETECT_FILL_FAR = 0.32; // per second at the edge of the cone
export const DETECT_DRAIN = 0.55; // per second while unseen
export const DETECT_SUSPICIOUS_AT = 0.35; // guard turns and stares
export const NOISE_RUN_RADIUS = 235;
export const NOISE_STEP_INTERVAL = 0.34; // seconds between noisy steps while running
export const CHASE_LOSE_SIGHT_AFTER = 2.5; // seconds without sight before giving up
export const SEARCH_PAUSE = 2.0; // seconds scanning the last-seen spot
export const CATCH_RADIUS = 21;
export const PICKUP_RADIUS = 27;
export const MAX_NERVES = 3;

export const COLORS = {
  floorLight: '#2a2f3a',
  floorDark: '#262b35',
  floorTrim: '#313644',
  wall: '#4a4238',
  wallTop: '#6b5d4c',
  caseWood: '#7a5c38',
  caseGlass: '#9fc4d8',
  pillar: '#5c5648',
  pillarTop: '#8a7f68',
  exit: '#37c978',
  exitGlow: '#1f7a48',
  artifact: '#ffd76a',
  player: '#e8e4d8',
  playerSneak: '#b9c4d6',
  guard: '#d95f4b',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneEdge: 'rgba(255, 214, 90, 0.55)',
  coneSuspicious: 'rgba(255, 150, 60, 0.30)',
  coneAlarm: 'rgba(255, 70, 60, 0.34)',
  hudBar: '#20242e',
  hudText: '#e8e4d8',
  hudDim: '#9aa3b2',
  titleBg: '#14161d',
};
