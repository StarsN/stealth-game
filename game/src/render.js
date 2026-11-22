// Quiet Hours — every pixel the player sees. Top-down canvas rendering:
// a chequered museum floor, wooden display cases, stone pillars, the guards
// with their sweeping vision cones, and the HUD that tells the player how
// close they are to being seen.
import { COLORS, TILE, VIEW_H, VIEW_W } from './config.js';
import { LEVEL, tileCenter } from './level.js';
import { conePolygon } from './vision.js';

function drawFloor(ctx) {
  for (let ty = 0; ty < 18; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorLight : COLORS.floorDark;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // Room-divider trim lines, so the three rooms read at a glance.
  ctx.strokeStyle = COLORS.floorTrim;
  ctx.lineWidth = 2;
  for (const x of [10 * TILE, 21 * TILE]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW_H);
    ctx.stroke();
  }
}

function drawWalls(ctx) {
  ctx.fillStyle = COLORS.wall;
  for (const key of LEVEL.walls) {
    const [tx, ty] = key.split(',').map(Number);
    ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
  }
  ctx.fillStyle = COLORS.wallTop;
  for (const key of LEVEL.walls) {
    const [tx, ty] = key.split(',').map(Number);
    ctx.fillRect(tx * TILE, ty * TILE, TILE, 5);
  }
}

function drawCover(ctx) {
  for (const c of LEVEL.cases) {
    const x = c.tx * TILE;
    const y = c.ty * TILE;
    ctx.fillStyle = COLORS.caseWood;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = COLORS.caseGlass;
    ctx.fillRect(x + 7, y + 7, TILE - 14, TILE - 14);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 7);
    ctx.lineTo(x + TILE - 7, y + TILE - 7);
    ctx.stroke();
  }
  for (const p of LEVEL.pillars) {
    const x = p.tx * TILE;
    const y = p.ty * TILE;
    ctx.fillStyle = COLORS.pillar;
    ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = COLORS.pillarTop;
    ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 16);
  }
}

function drawArtifactsAndExit(ctx, game, time) {
  // Exit pad: green while locked, bright and pulsing once all three are held.
  const e = tileCenter(LEVEL.exit.tx, LEVEL.exit.ty);
  const open = game.player.hasAllArtifacts;
  ctx.save();
  ctx.fillStyle = open ? COLORS.exit : COLORS.exitGlow;
  ctx.globalAlpha = open ? 0.85 + 0.15 * Math.sin(time / 180) : 0.45;
  ctx.fillRect(e.x - 18, e.y - 18, 36, 36);
  ctx.restore();
  ctx.strokeStyle = '#eafff2';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x - 18, e.y - 18, 36, 36);
  ctx.fillStyle = '#eafff2';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x, e.y + 4);

  for (const a of LEVEL.artifacts) {
    if (a.taken) continue;
    const c = tileCenter(a.tx, a.ty);
    const bob = Math.sin(time / 300 + a.tx) * 3;
    ctx.save();
    ctx.shadowColor = COLORS.artifact;
    ctx.shadowBlur = 14;
    ctx.fillStyle = COLORS.artifact;
    ctx.beginPath();
    ctx.arc(c.x, c.y + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#7a5c00';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('◆', c.x, c.y + bob + 3.5);
  }
}

function drawCone(ctx, guard) {
  const poly = conePolygon(guard.x, guard.y, guard.angle);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle =
    guard.state === 'chase' ? COLORS.coneAlarm : guard.state === 'suspicious' ? COLORS.coneSuspicious : COLORS.coneCalm;
  ctx.fill();
  ctx.strokeStyle = COLORS.coneEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, guard) {
  // Body: a red circle with a facing tick, plus a state mark above.
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a241a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#ffd9d2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.angle) * 17, guard.y + Math.sin(guard.angle) * 17);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  const mark = guard.state === 'chase' ? '!' : guard.state === 'suspicious' || guard.state === 'search' ? '?' : '';
  if (mark) ctx.fillText(mark, guard.x, guard.y - 20);
  // Suspicion arc under the guard while the meter is climbing.
  if (guard.suspicion > 0.03 && guard.state !== 'chase') {
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 20, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd9d2';
  ctx.font = '10px sans-serif';
  ctx.fillText(guard.name, guard.x, guard.y + 27);
}

function drawPlayer(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  // Soft shadow so the player reads against the floor.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(player.facing);
  ctx.fillStyle = player.sneaking ? COLORS.playerSneak : COLORS.player;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5c5648';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Nose: which way the player faces.
  ctx.fillStyle = '#5c5648';
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(4, -6);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, game) {
  const p = game.player;
  ctx.fillStyle = COLORS.hudBar;
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('QUIET HOURS', 14, 23);
  // Artifacts carried.
  ctx.fillStyle = COLORS.artifact;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(190 + i * 26, 17, 8, 0, Math.PI * 2);
    if (i < p.artifacts) ctx.fill();
    else ctx.stroke();
  }
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`${p.artifacts} / 3 artifacts`, 280, 23);
  // Detection: the highest suspicion among the guards.
  const worst = Math.max(0, ...game.guards.map((g) => g.suspicion));
  const chasing = game.guards.some((g) => g.state === 'chase');
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(chasing ? 'SPOTTED!' : worst > 0.35 ? 'seen...' : 'unseen', 470, 23);
  ctx.fillStyle = '#3a3f4d';
  ctx.fillRect(560, 9, 180, 16);
  ctx.fillStyle = chasing ? '#ff463c' : worst > 0.35 ? '#ffb347' : '#37c978';
  ctx.fillRect(560, 9, 180 * worst, 16);
  // Nerves (lives) and the clock.
  ctx.fillStyle = '#ff6b81';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('♥'.repeat(game.nerves) + '♡'.repeat(3 - game.nerves), 780, 23);
  const secs = Math.floor(game.elapsed / 1000);
  ctx.fillStyle = COLORS.hudText;
  ctx.textAlign = 'right';
  ctx.fillText(`time ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, VIEW_W - 14, 23);
  ctx.textAlign = 'left';
  // Controls reminder, faint, along the bottom.
  ctx.fillStyle = 'rgba(232,228,216,0.55)';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD / arrows move   ·   Shift run (loud)   ·   C sneak   ·   P pause   ·   M mute', 14, VIEW_H - 10);
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 12, 18, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 60);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 10 + i * 30));
  ctx.textAlign = 'left';
}

export function render(ctx, game, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  drawArtifactsAndExit(ctx, game, time);
  drawCover(ctx);
  drawWalls(ctx);
  for (const g of game.guards) drawCone(ctx, g);
  for (const g of game.guards) drawGuard(ctx, g);
  drawPlayer(ctx, game.player);
  if (game.screen === 'playing' || game.screen === 'paused') drawHud(ctx, game);

  if (game.screen === 'title') {
    drawOverlay(ctx, 'QUIET HOURS', [
      'Night shift at the Halcyon Museum. Three artifacts are misfiled in the vault wing.',
      'Slip past the guards, pocket all three, and reach the green EXIT — unseen.',
      'WASD / arrows move · Shift runs (loud) · C sneaks · stay out of the yellow cones.',
      '',
      'Click or press Enter to begin',
    ], '#ffd76a');
  } else if (game.screen === 'paused') {
    drawOverlay(ctx, 'PAUSED', ['Take a breath. The guards wait for no one — except now.', 'Press P or click to resume'], '#e8e4d8');
  } else if (game.screen === 'caught') {
    drawOverlay(ctx, 'CAUGHT!', ['A guard laid a hand on your shoulder. The wing resets.', `${game.nerves} ${game.nerves === 1 ? 'nerve' : 'nerves'} left — click or press Enter to try again`], '#ff6b5e');
  } else if (game.screen === 'gameover') {
    drawOverlay(ctx, 'ESCORTED OUT', ['Three strikes. Security walks you to the door at dawn.', `You carried ${game.player.artifacts} of 3 artifacts.`, 'Click or press Enter to start a new shift'], '#ff6b5e');
  } else if (game.screen === 'win') {
    const secs = Math.floor(game.elapsed / 1000);
    drawOverlay(ctx, 'CLEAN GETAWAY', [
      `All three artifacts recovered in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} — not a single alarm raised that stuck.`,
      `Alarms tripped: ${game.alarms} · times caught: ${game.timesCaught}`,
      'The curator will never know. Click or press Enter to play again.',
    ], '#37c978');
  }
}
