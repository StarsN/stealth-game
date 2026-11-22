// Quiet Hours — the guards. Each guard runs a small state machine:
//   patrol     walk the waypoints, pausing to look around at each one
//   suspicious something caught the eye — stop, stare, meter climbing
//   chase      the player is fully spotted — run them down
//   search     lost the player — walk to the last-seen spot and scan it
//   return     walk back to the nearest waypoint and resume the patrol
// A guard never teleports and never knows where the player is without sight
// or sound; every transition is driven by what it can actually perceive.
import {
  CHASE_LOSE_SIGHT_AFTER,
  DETECT_DRAIN,
  DETECT_FILL_CLOSE,
  DETECT_FILL_FAR,
  DETECT_SUSPICIOUS_AT,
  GUARD_CHASE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_RADIUS,
  GUARD_SEARCH_SPEED,
  SEARCH_PAUSE,
  TILE,
} from './config.js';
import { circleFits, tileCenter } from './level.js';
import { coneSees } from './vision.js';

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  // Axis-separated movement so the guard slides along walls instead of
  // sticking on corners.
  if (circleFits(nx, guard.y, GUARD_RADIUS)) guard.x = nx;
  if (circleFits(guard.x, ny, GUARD_RADIUS)) guard.y = ny;
  guard.angle = angleLerp(guard.angle, Math.atan2(dy, dx), Math.min(1, dt * 8));
  return dist <= step + 0.5;
}

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.waypoints = def.waypoints.map((w) => tileCenter(w.tx, w.ty));
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.angle = 0;
    this.state = 'patrol';
    this.wpIndex = 1;
    this.pauseTimer = 0;
    this.suspicion = 0; // 0..1 detection meter, shared with the HUD
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.lastSeen = null;
    this.scanAngle = 0;
  }

  // A noise at (x, y) pulls a patrolling guard over to investigate it.
  hearNoise(x, y, radius) {
    if (this.state !== 'patrol' && this.state !== 'suspicious') return;
    const d = Math.hypot(x - this.x, y - this.y);
    if (d > radius) return;
    this.lastSeen = { x, y };
    this.state = 'search';
    this.searchTimer = 0;
  }

  update(dt, player) {
    // What can this guard see right now?
    const closeness = coneSees(this.x, this.y, this.angle, player.x, player.y);
    let stanceFactor = 1;
    if (player.sneaking) stanceFactor = 0.55;
    else if (player.running) stanceFactor = 1.6;
    if (closeness > 0) {
      const fill = (DETECT_FILL_FAR + (DETECT_FILL_CLOSE - DETECT_FILL_FAR) * closeness) * stanceFactor;
      this.suspicion = Math.min(1, this.suspicion + fill * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
    } else {
      this.suspicion = Math.max(0, this.suspicion - DETECT_DRAIN * dt);
    }

    if (this.suspicion >= 1 && this.state !== 'chase') {
      this.state = 'chase';
      this.loseSightTimer = 0;
    }

    switch (this.state) {
      case 'patrol': {
        if (this.suspicion >= DETECT_SUSPICIOUS_AT) {
          // Freeze and stare at the thing that moved. If the meter keeps
          // climbing this becomes a chase; if it drains, patrol resumes.
          this.state = 'suspicious';
          break;
        }
        if (this.pauseTimer > 0) {
          this.pauseTimer -= dt;
          this.angle += dt * 0.9; // slow look-around at the waypoint
          break;
        }
        const target = this.waypoints[this.wpIndex];
        if (moveToward(this, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.pauseTimer = 0.8;
        }
        break;
      }
      case 'suspicious': {
        if (this.suspicion < DETECT_SUSPICIOUS_AT * 0.5) {
          this.state = 'patrol';
          break;
        }
        if (closeness > 0) {
          this.angle = angleLerp(this.angle, Math.atan2(player.y - this.y, player.x - this.x), Math.min(1, dt * 6));
        }
        break;
      }
      case 'chase': {
        if (closeness > 0) {
          this.loseSightTimer = 0;
        } else {
          this.loseSightTimer += dt;
          if (this.loseSightTimer >= CHASE_LOSE_SIGHT_AFTER) {
            this.state = 'search';
            this.searchTimer = 0;
            break;
          }
        }
        moveToward(this, player.x, player.y, GUARD_CHASE_SPEED, dt);
        break;
      }
      case 'search': {
        if (this.lastSeen) {
          if (moveToward(this, this.lastSeen.x, this.lastSeen.y, GUARD_SEARCH_SPEED, dt)) {
            this.searchTimer += dt;
            this.angle += dt * 1.6; // scan the spot, turning in place
            if (this.searchTimer >= SEARCH_PAUSE) {
              this.state = 'return';
            }
          }
        } else {
          this.state = 'return';
        }
        break;
      }
      case 'return': {
        // Walk back to the nearest waypoint, then pick the patrol up there.
        let best = 0;
        let bestDist = Infinity;
        this.waypoints.forEach((w, i) => {
          const d = Math.hypot(w.x - this.x, w.y - this.y);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        const target = this.waypoints[best];
        if (moveToward(this, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
          this.wpIndex = (best + 1) % this.waypoints.length;
          this.state = 'patrol';
        }
        break;
      }
      default:
        break;
    }
  }
}
