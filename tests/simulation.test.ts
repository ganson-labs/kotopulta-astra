import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, DEFAULT_AIM, trajectory } from '../src/game/simulation';
import { LEVELS } from '../src/game/levels';

const shots = [
  { degrees: 40, power: 18.7, boostAt: 1020 },
  { degrees: 44, power: 17.5, boostAt: 1150 },
  { degrees: 40, power: 21.5, boostAt: 1150 },
  { degrees: 48, power: 18.7, boostAt: 0 },
  { degrees: 37.24, power: 17.5, boostAt: 1150 },
  { degrees: 48, power: 18.7, boostAt: 1150 },
  { degrees: 48, power: 17.5, boostAt: 1150 },
  { degrees: 56, power: 17.5, boostAt: 1150 },
];

for (let level = 0; level < LEVELS.length; level++) {
  test(`Level ${level + 1}: stable tower, physical one-shot solution, three stars, immutable result`, () => {
    const sim = new Simulation(level), p = { ...sim.target.position };
    for (let i = 0; i < 600; i++) sim.step();
    assert.ok(Math.hypot(sim.target.position.x - p.x, sim.target.position.y - p.y) < 5);
    assert.equal(sim.awake, false);
    const shot = shots[level];
    assert.equal(sim.shoot({ angle: -shot.degrees * Math.PI / 180, power: shot.power }), true);
    for (let i = 0; i < 600; i++) {
      if (shot.boostAt && sim.projectile && sim.projectile.position.x >= shot.boostAt) sim.boost();
      sim.step(); if (sim.phase === 'won') break;
    }
    assert.equal(sim.phase, 'won'); assert.equal(sim.stars, 3);
    const score = sim.score, position = { ...sim.target.position };
    for (let i = 0; i < 180; i++) sim.step();
    assert.equal(sim.score, score); assert.deepEqual(sim.target.position, position);
    assert.equal(sim.shoot(DEFAULT_AIM), false);
    sim.destroy();
  });
}
test('Three genuine misses produce loss; no bonus boost or fourth shot', () => {
  const sim = new Simulation(0);
  assert.equal(sim.boost(), false);
  for (let shot = 0; shot < 3; shot++) {
    assert.equal(sim.shoot({ angle: -1.2, power: 10 }), true);
    assert.equal(sim.shoot(DEFAULT_AIM), false);
    for (let i = 0; i < 600; i++) { sim.step(); if (sim.phase !== 'flying') break; }
  }
  assert.equal(sim.phase, 'lost'); assert.equal(sim.stars, 0); assert.equal(sim.shotsLeft, 0);
  assert.equal(sim.shoot(DEFAULT_AIM), false); sim.destroy();
});
test('The aiming arc predicts actual Matter physics, not a decorative parabola', () => {
  const sim = new Simulation(0), points = trajectory(DEFAULT_AIM);
  sim.shoot(DEFAULT_AIM);
  for (let i = 0; i < 40; i++) {
    sim.step();
    if (i % 4 === 0 && sim.projectile) {
      assert.ok(Math.hypot(sim.projectile.position.x - points[i / 4].x, sim.projectile.position.y - points[i / 4].y) < 1);
    }
  }
  assert.equal(sim.boost(), true); assert.equal(sim.boost(), false); sim.destroy();
});
