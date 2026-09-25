import Matter from 'matter-js';
import { LEVELS, WORLD, type BlockSpec, type Level } from './levels';

const { Engine, Bodies, Body, Composite, Events, Vector } = Matter;
export type Phase = 'ready' | 'flying' | 'won' | 'lost';
export interface Block { id: number; body: Matter.Body; spec: BlockSpec; hp: number; broken: boolean }
export type GameEvent =
  | { type: 'shot' | 'boost' | 'wake' | 'win' | 'lose'; x: number; y: number }
  | { type: 'fish'; x: number; y: number; count: number }
  | { type: 'impact'; x: number; y: number; force: number }
  | { type: 'break'; x: number; y: number; material: BlockSpec['material'] };
export interface Aim { angle: number; power: number }
export const DEFAULT_AIM: Aim = { angle: -0.65, power: 18.7 };
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function aimAt(x: number, y: number): Aim {
  const dx = x - WORLD.cannon.x, dy = y - WORLD.cannon.y;
  return { angle: clamp(Math.atan2(dy, dx), -1.34, -0.13), power: clamp(Math.hypot(dx, dy) / 29, 10, 28) };
}
export function muzzle(aim: Aim) {
  return { x: WORLD.cannon.x + Math.cos(aim.angle) * 94, y: WORLD.cannon.y + Math.sin(aim.angle) * 94 };
}
export function trajectory(aim: Aim, wind = 0): { x: number; y: number }[] {
  const origin = muzzle(aim), points = [];
  let x = origin.x, y = origin.y, vx = Math.cos(aim.angle) * aim.power, vy = Math.sin(aim.angle) * aim.power;
  for (let i = 0; i < 125; i++) {
    vx += wind * (1000 / 60) ** 2; vy += 0.00115 * (1000 / 60) ** 2;
    x += vx; y += vy;
    if (i % 4 === 0) points.push({ x, y });
    if (y > WORLD.floor || x > 1560) break;
  }
  return points;
}

/** Physics and campaign rules are independent of Phaser, DOM, and animation time. */
export class Simulation {
  readonly engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
  readonly level: Level;
  readonly blocks: Block[] = [];
  readonly fish: { x: number; y: number; collected: boolean }[];
  readonly target: Matter.Body;
  readonly events: GameEvent[] = [];
  phase: Phase = 'ready';
  projectile: Matter.Body | null = null;
  spent = 0;
  collected = 0;
  score = 0;
  boosted = false;
  awake = false;
  elapsed = 0;
  flightTime = 0;
  private wonTime = 0;
  private contactCooldown = 0;
  private targetStart = { x: 0, y: 0 };
  private settled = false;
  private wakeImpulse = false;

  constructor(readonly levelIndex: number) {
    this.level = LEVELS[levelIndex] ?? LEVELS[0];
    this.engine.gravity.y = 1.15;
    Composite.add(this.engine.world, [
      Bodies.rectangle(180, 792, 510, 96, { isStatic: true, friction: 0.8, label: 'dock' }),
      Bodies.rectangle(1260, 802, 820, 116, { isStatic: true, friction: 0.8, label: 'dock' }),
    ]);
    for (const spec of this.level.blocks) {
      const body = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        chamfer: { radius: 3 }, density: spec.material === 'teal' ? 0.0018 : 0.0011,
        friction: 0.65, frictionStatic: 1, restitution: 0.07, sleepThreshold: 90, label: 'block',
      });
      this.blocks.push({ id: body.id, body, spec, hp: spec.material === 'glass' ? 2.8 : spec.material === 'teal' ? 14 : 9, broken: false });
      Composite.add(this.engine.world, body);
    }
    this.target = Bodies.circle(this.level.target.x, this.level.target.y, 34, {
      density: 0.001, friction: 0.8, restitution: 0.1, label: 'target', sleepThreshold: 90,
    });
    Composite.add(this.engine.world, this.target);
    this.fish = this.level.fish.map(f => ({ ...f, collected: false }));
    // Settle the stack before enabling wake/impact rules.
    for (let i = 0; i < 120; i++) Engine.update(this.engine, 1000 / 60);
    this.targetStart = { ...this.target.position };
    this.settled = true;
    Events.on(this.engine, 'collisionStart', event => {
      if (!this.settled || this.phase === 'ready') return;
      for (const pair of event.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        const relative = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
        const hasPlayer = a === this.projectile || b === this.projectile;
        if ((a === this.target || b === this.target) && (hasPlayer || relative > 2.6)) this.wake();
        if (relative > 1.8) {
          const p = pair.collision.supports[0] ?? a.position;
          if (this.elapsed > this.contactCooldown) {
            this.events.push({ type: 'impact', x: p.x, y: p.y, force: relative });
            this.contactCooldown = this.elapsed + 0.07;
          }
          for (const body of [a, b]) {
            const block = this.blocks.find(v => v.id === body.id);
            if (block && !block.broken) block.hp -= relative * (hasPlayer ? 1.3 : 0.5);
          }
        }
      }
    });
  }

  get stars() { return this.awake ? 1 + (this.collected >= 2 ? 1 : 0) + (this.spent === 1 ? 1 : 0) : 0; }
  get shotsLeft() { return this.level.shots - this.spent; }

  shoot(aim: Aim): boolean {
    if (this.phase !== 'ready' || this.shotsLeft <= 0) return false;
    if (this.projectile) Composite.remove(this.engine.world, this.projectile);
    const origin = muzzle(aim);
    this.projectile = Bodies.circle(origin.x, origin.y, 27, { density: 0.0065, friction: 0.4, frictionAir: 0, restitution: 0.36, label: 'player' });
    Body.setVelocity(this.projectile, { x: Math.cos(aim.angle) * aim.power, y: Math.sin(aim.angle) * aim.power });
    Composite.add(this.engine.world, this.projectile);
    this.spent++; this.boosted = false; this.flightTime = 0; this.phase = 'flying';
    this.events.push({ type: 'shot', ...origin });
    return true;
  }

  boost(): boolean {
    if (this.phase !== 'flying' || !this.projectile || this.boosted || this.awake) return false;
    this.boosted = true;
    const p = this.projectile.position;
    this.events.push({ type: 'boost', x: p.x, y: p.y });
    Body.setVelocity(this.projectile, { x: this.projectile.velocity.x + 7, y: this.projectile.velocity.y - 3 });
    for (const block of this.blocks) {
      const d = Vector.sub(block.body.position, p), distance = Vector.magnitude(d);
      if (!block.broken && distance < 195) {
        const strength = (1 - distance / 240) * 10;
        const normal = Vector.normalise(d);
        Matter.Sleeping.set(block.body, false);
        Body.setVelocity(block.body, { x: normal.x * strength + 3, y: normal.y * strength - 3 });
        block.hp -= strength;
      }
    }
    if (Vector.magnitude(Vector.sub(this.target.position, p)) < 175) this.wake();
    this.collect(180);
    return true;
  }

  private wake() {
    if (this.awake || this.phase === 'ready') return;
    this.awake = true; this.wonTime = this.elapsed; this.score += 1000 + this.shotsLeft * 300;
    this.wakeImpulse = true;
    this.events.push({ type: 'wake', ...this.target.position });
    // The startled cat kicks the perch: even a clean hit ends with a little spectacle.
    for (const block of this.blocks) {
      const d = Vector.sub(block.body.position, this.target.position), distance = Vector.magnitude(d);
      if (!block.broken && distance < 240) {
        Matter.Sleeping.set(block.body, false);
        Body.setVelocity(block.body, { x: block.body.velocity.x + (d.x >= 0 ? 1 : -1) * (8 - distance / 45), y: block.body.velocity.y - 4.5 });
        Body.setAngularVelocity(block.body, d.x >= 0 ? 0.06 : -0.06);
      }
    }
  }

  private collect(radius: number) {
    if (!this.projectile) return;
    for (const fish of this.fish) {
      if (!fish.collected && Vector.magnitude(Vector.sub(fish, this.projectile.position)) < radius) {
        fish.collected = true; this.collected++; this.score += 250;
        this.events.push({ type: 'fish', x: fish.x, y: fish.y, count: this.collected });
      }
    }
  }

  step() {
    if (this.phase === 'lost' || this.phase === 'won') return;
    this.elapsed += 1 / 60;
    Engine.update(this.engine, 1000 / 60);
    if (this.wakeImpulse) {
      this.wakeImpulse = false;
      Matter.Sleeping.set(this.target, false);
      this.target.frictionAir = 0.04;
      Body.setVelocity(this.target, { x: 3, y: -8 });
      Body.setAngularVelocity(this.target, 0.045);
    }
    if (this.awake) Body.setVelocity(this.target, { x: clamp(this.target.velocity.x, -6, 6), y: clamp(this.target.velocity.y, -12, 10) });
    for (const block of this.blocks) {
      if (!block.broken && (block.hp <= 0 || block.body.position.y > 1050)) {
        block.broken = true; this.score += 70;
        this.events.push({ type: 'break', ...block.body.position, material: block.spec.material });
        Composite.remove(this.engine.world, block.body);
      }
    }
    if (this.phase !== 'flying') return;
    this.flightTime += 1 / 60;
    if (this.projectile) {
      Body.applyForce(this.projectile, this.projectile.position, { x: this.level.wind * this.projectile.mass, y: 0 });
      this.collect(49);
      if (!this.awake && Vector.magnitude(Vector.sub(this.target.position, this.targetStart)) > 42) this.wake();
      if (!this.awake && Vector.magnitude(Vector.sub(this.target.position, this.projectile.position)) < 65) this.wake();
      const p = this.projectile.position;
      const done = this.flightTime > 8 || p.y > 1050 || p.x > 1750 || p.x < -200 || (this.flightTime > 2 && this.projectile.speed < 0.65);
      if (done && !this.awake) {
        if (this.shotsLeft > 0) this.phase = 'ready';
        else { this.phase = 'lost'; this.events.push({ type: 'lose', x: p.x, y: p.y }); }
      }
    }
    if (this.awake && this.elapsed - this.wonTime > 1.4) {
      this.phase = 'won'; this.events.push({ type: 'win', ...this.target.position });
    }
  }

  drainEvents() { return this.events.splice(0); }
  destroy() { Events.off(this.engine, 'collisionStart'); Composite.clear(this.engine.world, false); Engine.clear(this.engine); }
}
