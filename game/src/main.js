// Quiet Hours — the game itself: screens, the loop, input, and the rules that
// tie the player and the guards together (spotted, caught, win, lose).
import { CATCH_RADIUS, MAX_NERVES, VIEW_H, VIEW_W } from './config.js';
import { LEVEL } from './level.js';
import { Guard } from './guard.js';
import { Player } from './player.js';
import { SoundFX } from './audio.js';
import { render } from './render.js';
import { applyShot } from './shots.js';
import { GUARDS } from './level.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const sounds = new SoundFX();
const input = { up: false, down: false, left: false, right: false, run: false, sneak: false };

const game = {
  screen: 'title',
  player: new Player(),
  guards: GUARDS.map((def) => new Guard(def)),
  nerves: MAX_NERVES,
  elapsed: 0,
  alarms: 0,
  timesCaught: 0,
  frozen: false,
  stepSoundTimer: 0,
  // Mark the first n artifacts as taken (used by staged screenshots).
  levelArtifactsTaken(n) {
    LEVEL.artifacts.forEach((a, i) => {
      a.taken = i < n;
    });
  },
};

function resetLevel() {
  for (const a of LEVEL.artifacts) a.taken = false;
  game.player.reset();
  game.guards = GUARDS.map((def) => new Guard(def));
}

function startShift() {
  resetLevel();
  game.nerves = MAX_NERVES;
  game.elapsed = 0;
  game.alarms = 0;
  game.timesCaught = 0;
  game.screen = 'playing';
  sounds.ensure();
  sounds.click();
}

function onCaught() {
  game.timesCaught += 1;
  game.nerves -= 1;
  sounds.caught();
  if (game.nerves <= 0) {
    game.screen = 'gameover';
  } else {
    game.screen = 'caught';
  }
  // The wing resets: everyone back to their starting posts, meters cleared,
  // but the artifacts already pocketed stay pocketed.
  const kept = game.player.artifacts;
  resetLevel();
  game.player.artifacts = kept;
  game.levelArtifactsTaken(kept);
}

function update(dt) {
  if (game.screen !== 'playing' || game.frozen) return;
  game.elapsed += dt * 1000;
  const p = game.player;
  const before = p.artifacts;
  p.update(dt, input);
  if (p.artifacts > before) sounds.pickup();
  // Footsteps: a soft tick on a steady beat while moving.
  if (p.moving) {
    game.stepSoundTimer -= dt;
    if (game.stepSoundTimer <= 0) {
      game.stepSoundTimer = p.running ? 0.28 : 0.45;
      sounds.footstep(p.sneaking);
    }
  }
  // Noise events pull patrolling guards over to investigate.
  for (const noise of p.noiseEvents) {
    for (const g of game.guards) g.hearNoise(noise.x, noise.y, noise.radius);
  }
  p.noiseEvents.length = 0;

  let anyChase = false;
  for (const g of game.guards) {
    const wasChase = g.state === 'chase';
    g.update(dt, p);
    if (g.state === 'chase' && !wasChase) {
      game.alarms += 1;
      sounds.alarm();
    }
    if (g.state === 'chase') anyChase = true;
    // Caught: a chasing guard gets a hand on the player.
    if (g.state === 'chase' && Math.hypot(g.x - p.x, g.y - p.y) < CATCH_RADIUS) {
      onCaught();
      return;
    }
  }
  if (!anyChase && p.onExit) {
    game.screen = 'win';
    sounds.win();
  }
}

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyC: 'sneak', ControlLeft: 'sneak',
};

window.addEventListener('keydown', (e) => {
  sounds.ensure();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  const mapped = KEYMAP[e.code];
  if (mapped) {
    input[mapped] = true;
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (game.screen === 'playing') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'playing';
    return;
  }
  if (e.code === 'KeyM') {
    sounds.muted = !sounds.muted;
    return;
  }
  if (e.code === 'Enter' || e.code === 'Space') {
    if (game.screen === 'title' || game.screen === 'gameover' || game.screen === 'win') startShift();
    else if (game.screen === 'caught') game.screen = 'playing';
  }
});
window.addEventListener('keyup', (e) => {
  const mapped = KEYMAP[e.code];
  if (mapped) input[mapped] = false;
});
canvas.addEventListener('mousedown', () => {
  sounds.ensure();
  if (game.screen === 'title' || game.screen === 'gameover' || game.screen === 'win') startShift();
  else if (game.screen === 'caught') game.screen = 'playing';
  else if (game.screen === 'paused') game.screen = 'playing';
});

// A ?shot= parameter stages one composed moment for the screenshots.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) applyShot(game, shot);

// Debug and playtest handle: the playtest reads the live state through it.
window.__quiet = { game, input, sounds };

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render(ctx, game, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
