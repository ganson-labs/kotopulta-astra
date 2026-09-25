import { Simulation } from '../src/game/simulation';
import { LEVELS } from '../src/game/levels';
import { writeFileSync } from 'node:fs';

const solutions: unknown[] = [];
for (let index = 0; index < LEVELS.length; index++) {
  let best: { angle: number; power: number; boostAt: number; stars: number; fish: number; score: number } | null = null;
  const resting = new Simulation(index);
  const start = { ...resting.target.position };
  for (let n = 0; n < 600; n++) resting.step();
  console.log(JSON.stringify({ level: index, restingDrift: Math.hypot(resting.target.position.x - start.x, resting.target.position.y - start.y), target: resting.target.position }));
  resting.destroy();
  search: for (const degrees of [37.24, 40, 44, 48, 52, 56, 32, 60, 28]) {
    for (const power of [18.7, 19.5, 20.5, 21.5, 22.5, 17.5, 23.5, 24.5]) {
      for (const boostAt of [0, 1020, 1150, 920]) {
        const sim = new Simulation(index), angle = -degrees * Math.PI / 180;
        sim.shoot({ angle, power });
        for (let i = 0; i < 600; i++) {
          if (boostAt && sim.projectile && sim.projectile.position.x >= boostAt) sim.boost();
          sim.step();
          if (sim.phase === 'won' || sim.phase === 'ready' || sim.phase === 'lost') break;
        }
        if (sim.phase === 'won' && (!best || sim.stars > best.stars || sim.stars === best.stars && sim.score > best.score)) best = { angle, power, boostAt, stars: sim.stars, fish: sim.collected, score: sim.score };
        sim.destroy();
        if (best?.stars === 3 && best.fish === 3) break search;
      }
    }
  }
  solutions.push({ level: index, ...best });
  console.log(JSON.stringify({ level: index, solution: best }));
}
writeFileSync('test-results/solutions.json', JSON.stringify(solutions, null, 2));
