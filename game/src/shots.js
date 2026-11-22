// Quiet Hours — staged scenes for screenshots. A ?shot= URL parameter freezes
// the game into one composed moment so the four screenshots are real renders
// of the game's own code, taken the same way every time:
//   title   the title screen
//   patrol  mid-game: the player crouched behind a case, Mara's cone sweeping past
//   alarm   the alarm: Ilsa chasing, detection full, the player sprinting for cover
//   win     the clean-getaway screen after the exit is reached
import { tileCenter } from './level.js';

function placeGuard(game, name, tx, ty, angle, state, suspicion) {
  const g = game.guards.find((gg) => gg.name === name);
  if (!g) return;
  const c = tileCenter(tx, ty);
  g.x = c.x;
  g.y = c.y;
  g.angle = angle;
  g.state = state;
  g.suspicion = suspicion;
}

function placePlayer(game, tx, ty, facing, sneaking) {
  const c = tileCenter(tx, ty);
  game.player.x = c.x;
  game.player.y = c.y;
  game.player.facing = facing;
  game.player.sneaking = sneaking;
  game.player.running = false;
}

export function applyShot(game, name) {
  game.frozen = true; // the staged frame never advances, so shots are identical
  if (name === 'title') {
    game.screen = 'title';
    return;
  }
  if (name === 'patrol') {
    game.screen = 'playing';
    // One artifact already pocketed; the player hides behind the left-wing
    // cases while Mara's cone sweeps the corridor a few tiles away.
    game.player.artifacts = 1;
    game.levelArtifactsTaken(1);
    placePlayer(game, 5, 9, -Math.PI / 2, true);
    placeGuard(game, 'Mara', 6, 8, Math.PI / 2, 'patrol', 0.42);
    placeGuard(game, 'Odo', 15, 9, 0, 'patrol', 0);
    placeGuard(game, 'Ilsa', 26, 9, Math.PI, 'patrol', 0);
    return;
  }
  if (name === 'alarm') {
    game.screen = 'playing';
    game.player.artifacts = 2;
    game.levelArtifactsTaken(2);
    // The player is caught in the open on row 12, sprinting down the corridor
    // while Ilsa gives chase, cone red, suspicion full.
    placePlayer(game, 25, 12, Math.PI, false);
    game.player.running = true;
    placeGuard(game, 'Ilsa', 24, 10, Math.PI / 2, 'chase', 1);
    placeGuard(game, 'Mara', 6, 9, -Math.PI / 2, 'suspicious', 0.55);
    placeGuard(game, 'Odo', 16, 7, Math.PI / 2, 'patrol', 0);
    return;
  }
  if (name === 'win') {
    game.screen = 'win';
    game.player.artifacts = 3;
    game.levelArtifactsTaken(3);
    game.elapsed = 187000;
    game.alarms = 1;
    game.timesCaught = 0;
    placePlayer(game, 27, 15, -Math.PI / 2, false);
    placeGuard(game, 'Ilsa', 24, 8, -Math.PI / 2, 'patrol', 0);
    placeGuard(game, 'Odo', 15, 9, 0, 'patrol', 0);
    placeGuard(game, 'Mara', 5, 9, Math.PI / 2, 'patrol', 0);
  }
}
