import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../engine/enemies';
import { spawnBullet } from '../engine/bullets';
import { stepWorld } from '../engine/step';
import { createWorld, defaultMeta } from '../engine/world';
import { xpToNextLevel } from '../engine/constants';

describe('combat loop', () => {
  it('kills an enemy with enough bullet damage and drops an XP orb', () => {
    const w = createWorld(defaultMeta());
    // Place an enemy right next to the player.
    const e = spawnEnemy(w, 'grunt', { x: 20, y: 0 });
    expect(e).toBeTruthy();
    // Fire a very powerful bullet straight at it.
    spawnBullet(w, {
      p: { x: 0, y: 0 },
      dir: { x: 1, y: 0 },
      dmg: 999,
      pierce: 0,
    });
    // Advance one frame.
    const events = stepWorld(w, 1 / 60);
    const killed = events.find((ev) => ev.type === 'ENEMY_KILLED');
    expect(killed).toBeTruthy();
    expect(w.enemies.some((en) => en.active)).toBe(false);
    expect(w.orbs.some((o) => o.active)).toBe(true);
  });

  it('bullets pierce the configured number of enemies then die', () => {
    const w = createWorld(defaultMeta());
    // Disable auto-fire so only the manual bullet acts in this test.
    w.weapons = [];
    for (let i = 0; i < 3; i++) {
      spawnEnemy(w, 'grunt', { x: 30 + i * 20, y: 0 });
    }
    spawnBullet(w, {
      p: { x: 0, y: 0 },
      dir: { x: 1, y: 0 },
      dmg: 999,
      pierce: 1, // can hit 2 enemies total
    });
    // Step long enough for the bullet to pass through its range.
    for (let i = 0; i < 30; i++) stepWorld(w, 1 / 60);
    const stillAlive = w.enemies.filter((e) => e.active).length;
    expect(stillAlive).toBe(1); // 2 killed, 1 survives
  });

  it('enemies damage the player on contact and emit PLAYER_HURT', () => {
    const w = createWorld(defaultMeta());
    w.weapons = []; // isolate contact damage
    const startHp = w.player.hp;
    spawnEnemy(w, 'tank', { x: 5, y: 0 });
    const events = stepWorld(w, 1 / 60);
    const hurt = events.find((ev) => ev.type === 'PLAYER_HURT');
    expect(hurt).toBeTruthy();
    expect(w.player.hp).toBeLessThan(startHp);
  });

  it('contact damage is rate-limited to contactTickInterval', () => {
    const w = createWorld(defaultMeta());
    w.weapons = [];
    spawnEnemy(w, 'tank', { x: 5, y: 0 });
    let hurtCount = 0;
    for (let i = 0; i < 60; i++) {
      // 1 second total, 60 frames
      const evs = stepWorld(w, 1 / 60);
      hurtCount += evs.filter((e) => e.type === 'PLAYER_HURT').length;
    }
    // At 0.5s cadence we should see about 2 hits over 1 second.
    expect(hurtCount).toBeGreaterThanOrEqual(2);
    expect(hurtCount).toBeLessThanOrEqual(3);
  });

  it('PLAYER_DIED fires when HP reaches zero', () => {
    const w = createWorld(defaultMeta());
    w.weapons = [];
    w.player.hp = 1;
    spawnEnemy(w, 'tank', { x: 5, y: 0 });
    let died = false;
    for (let i = 0; i < 120; i++) {
      const evs = stepWorld(w, 1 / 60);
      if (evs.some((e) => e.type === 'PLAYER_DIED')) died = true;
      if (!w.player.alive) break;
    }
    expect(died).toBe(true);
    expect(w.player.alive).toBe(false);
  });

  it('XP orb pickup triggers LEVEL_UP at the correct threshold', () => {
    const w = createWorld(defaultMeta());
    // Park the player, drop an orb next to it with exact threshold value.
    const need = xpToNextLevel(1);
    // Create orb via the bullet-kill path to use realistic flow.
    // Here we cheat: set xp directly then trigger an orb step with 1 XP.
    w.player.xp = need - 1;
    const o = w.orbs.find((x) => !x.active)!;
    o.active = true;
    o.p = { x: 2, y: 0 };
    o.value = 1;
    o.attracting = true;
    const evs = stepWorld(w, 1 / 60);
    expect(evs.find((e) => e.type === 'LEVEL_UP')).toBeTruthy();
    expect(w.player.level).toBe(2);
  });
});
