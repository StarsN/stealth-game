// Quiet Hours — the player. WASD or arrows to move, Shift to run (fast, loud),
// C or Ctrl to sneak (slow, quiet, harder to spot). Artifacts are picked up
// by walking over them; the exit opens once all three are carried.
import {
  NOISE_RUN_RADIUS,
  NOISE_STEP_INTERVAL,
  PICKUP_RADIUS,
  PLAYER_RADIUS,
  PLAYER_RUN_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_WALK_SPEED,
  TILE,
} from './config.js';
import { LEVEL, circleFits, tileCenter } from './level.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    const s = tileCenter(LEVEL.spawn.tx, LEVEL.spawn.ty);
    this.x = s.x;
    this.y = s.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = -Math.PI / 2; // facing up the wing, toward the first artifact
    this.running = false;
    this.sneaking = false;
    this.moving = false;
    this.stepTimer = 0;
    this.noiseEvents = []; // {x, y, radius} consumed by the guards each frame
    this.artifacts = 0;
  }

  update(dt, input) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.moving = mx !== 0 || my !== 0;
    this.running = !!input.run && this.moving && !input.sneak;
    this.sneaking = !!input.sneak && this.moving;
    const speed = this.running ? PLAYER_RUN_SPEED : this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      const nx = this.x + (mx / len) * speed * dt;
      const ny = this.y + (my / len) * speed * dt;
      // Axis-separated movement: slide along walls instead of sticking.
      if (circleFits(nx, this.y, PLAYER_RADIUS)) this.x = nx;
      if (circleFits(this.x, ny, PLAYER_RADIUS)) this.y = ny;
      this.facing = Math.atan2(my, mx);
      // A running step is loud enough for nearby guards to investigate.
      this.stepTimer -= dt;
      if (this.running && this.stepTimer <= 0) {
        this.stepTimer = NOISE_STEP_INTERVAL;
        this.noiseEvents.push({ x: this.x, y: this.y, radius: NOISE_RUN_RADIUS });
      }
    } else {
      this.stepTimer = 0;
    }

    // Walk over an artifact to pocket it.
    for (const a of LEVEL.artifacts) {
      if (a.taken) continue;
      const c = tileCenter(a.tx, a.ty);
      if (Math.hypot(c.x - this.x, c.y - this.y) < PICKUP_RADIUS) {
        a.taken = true;
        this.artifacts += 1;
        this.lastPickupAt = performance.now();
      }
    }
  }

  get hasAllArtifacts() {
    return this.artifacts >= LEVEL.artifacts.length;
  }

  get onExit() {
    if (!this.hasAllArtifacts) return false;
    const c = tileCenter(LEVEL.exit.tx, LEVEL.exit.ty);
    return Math.hypot(c.x - this.x, c.y - this.y) < TILE * 0.7;
  }
}
