import Phaser from 'phaser';
import { buildArt } from './art';
import { Simulation, DEFAULT_AIM, aimAt, trajectory, muzzle, clamp, type Aim, type GameEvent } from '../game/simulation';
import { WORLD } from '../game/levels';
import type { Soundscape } from '../audio/sound';

export interface ViewState { simulation: Simulation; aim: Aim; dragging: boolean; paused: boolean; fps: number }
interface Particle { image: Phaser.GameObjects.Image; vx: number; vy: number; life: number; max: number; spin: number; gravity: number; scale: number }
export class HarborScene extends Phaser.Scene {
  simulation = new Simulation(0);
  aim: Aim = { ...DEFAULT_AIM };
  paused = true;
  menu = true;
  dragging = false;
  loaded = false;
  onReady: () => void = () => undefined;
  onState: (state: ViewState) => void = () => undefined;
  onResult: (sim: Simulation) => void = () => undefined;
  onPause: () => void = () => undefined;
  private blocks = new Map<number, Phaser.GameObjects.Image>();
  private fishViews: Phaser.GameObjects.Container[] = [];
  private particles: Particle[] = [];
  private target!: Phaser.GameObjects.Image;
  private player!: Phaser.GameObjects.Image;
  private barrel!: Phaser.GameObjects.Image;
  private carriage!: Phaser.GameObjects.Image;
  private standby!: Phaser.GameObjects.Image;
  private aimGraphics!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private ambience!: Phaser.GameObjects.Graphics;
  private sleepText!: Phaser.GameObjects.Text;
  private aimLabel!: Phaser.GameObjects.Text;
  private tip!: Phaser.GameObjects.Text;
  private trace: { x: number; y: number }[] = [];
  private previousTrace: { x: number; y: number }[] = [];
  private accumulator = 0;
  private lastUi = 0;
  private ambientTime = 0;
  private slowmo = 0;
  private trailClock = 0;
  private resultSent = false;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private justTouch = false;
  private renderedFrames = 0;
  constructor(private readonly sfx: Soundscape) { super('Harbor'); }

  preload() { this.load.image('harbor', '/art/harbor.png'); }
  create() {
    buildArt(this);
    this.add.image(800, 450, 'harbor').setDisplaySize(1600, 900).setDepth(-20);
    this.add.rectangle(800, 450, 1600, 900, 0xffe4ad, 0.07).setDepth(-19);
    this.add.image(800, 80, 'bunting').setDisplaySize(1600, 150).setAlpha(0.65).setDepth(-10);
    this.ambience = this.add.graphics().setDepth(-5);
    this.add.image(800, 844, 'dock').setDisplaySize(1600, 220).setDepth(5);
    this.add.image(32, 716, 'bollard').setDisplaySize(70, 74).setDepth(6);
    this.add.image(1543, 714, 'bollard').setDisplaySize(72, 78).setDepth(6);
    this.add.image(880, 721, 'bollard').setDisplaySize(55, 59).setDepth(6).setAlpha(0.9);
    this.add.ellipse(238, 740, 240, 27, 0x24473e, 0.2).setDepth(7);
    this.carriage = this.add.image(233, 700, 'carriage').setDisplaySize(166, 115).setDepth(11);
    this.barrel = this.add.image(WORLD.cannon.x, WORLD.cannon.y, 'barrel').setDisplaySize(180, 100).setOrigin(0.21, 0.5).setDepth(10);
    this.standby = this.add.image(111, 685, 'pilot').setDisplaySize(109, 87).setDepth(12);
    this.player = this.add.image(-200, 0, 'pilot').setDisplaySize(97, 78).setDepth(15).setVisible(false);
    this.target = this.add.image(0, 0, 'sleepy').setDisplaySize(130, 104).setDepth(12);
    this.sleepText = this.add.text(0, 0, 'z Z z', { fontFamily: 'Nunito', fontSize: '32px', fontStyle: '900', color: '#456659', stroke: '#fff1c8', strokeThickness: 4 }).setDepth(13);
    this.aimLabel = this.add.text(0, 0, '', { fontFamily: 'Nunito', fontSize: '18px', fontStyle: '900', color: '#fff5d9', backgroundColor: '#315d52', padding: { x: 12, y: 6 } }).setDepth(18).setOrigin(0.5);
    this.tip = this.add.text(1228, 330, 'ТИШЕ. Я СПЛЮ.', { fontFamily: 'Nunito', fontSize: '15px', fontStyle: '900', color: '#536353', backgroundColor: '#fff0cfe8', padding: { x: 17, y: 9 } }).setDepth(13).setOrigin(0.5);
    this.aimGraphics = this.add.graphics().setDepth(9);
    this.trailGraphics = this.add.graphics().setDepth(9);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.paused || this.menu) return;
      this.sfx.unlock(); this.justTouch = pointer.wasTouch;
      if (this.simulation.phase === 'flying') { this.boost(); return; }
      if (this.simulation.phase !== 'ready') return;
      this.dragging = true; this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.paused || this.menu || this.simulation.phase !== 'ready') return;
      if (!pointer.wasTouch || this.dragging) this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointerup', () => { if (this.dragging) { this.dragging = false; this.fire(); } });
    this.input.on('pointerupoutside', () => { this.dragging = false; });
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,SPACE,R,ESC,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
      this.input.keyboard.on('keydown-SPACE', (event: KeyboardEvent) => { if (event.repeat || this.menu || this.paused) return; event.preventDefault(); if (this.simulation.phase === 'ready') this.fire(); else this.boost(); });
      this.input.keyboard.on('keydown-R', (event: KeyboardEvent) => { if (!event.repeat && !this.menu && !this.paused && (this.simulation.phase === 'ready' || this.simulation.phase === 'flying')) this.startLevel(this.simulation.levelIndex); });
      this.input.keyboard.on('keydown-ESC', (event: KeyboardEvent) => { if (!event.repeat && !this.menu) this.onPause(); });
    }
    this.loadLevelViews(); this.loaded = true; this.onReady();
    this.game.canvas.setAttribute('aria-label', 'Игровое поле Котопульты. Стрелки — прицел, пробел — выстрел или рывок.');
  }

  startLevel(index: number) {
    if (!this.loaded) return;
    this.simulation.destroy(); this.simulation = new Simulation(index);
    this.menu = false; this.paused = false; this.dragging = false; this.resultSent = false;
    this.aim = { ...DEFAULT_AIM }; this.accumulator = 0; this.trace = []; this.previousTrace = []; this.slowmo = 0;
    this.particles.forEach(p => p.image.destroy()); this.particles = [];
    this.player.setVisible(false); this.target.setTexture('sleepy');
    this.sfx.unlock(); this.sfx.setActive(true); this.loadLevelViews(); this.publish();
  }
  setPaused(paused: boolean) { this.paused = paused; this.dragging = false; this.accumulator = 0; this.sfx.setActive(!paused); this.publish(); }
  private loadLevelViews() {
    this.blocks.forEach(v => v.destroy()); this.blocks.clear();
    this.fishViews.forEach(v => v.destroy()); this.fishViews = [];
    for (const block of this.simulation.blocks) this.blocks.set(block.id, this.add.image(block.body.position.x, block.body.position.y, `crate-${block.spec.material}`).setDisplaySize(block.spec.w, block.spec.h).setDepth(8));
    for (const fish of this.simulation.fish) {
      const halo = this.add.circle(0, 0, 34, 0xffedb2, 0.2);
      const ring = this.add.circle(0, 0, 30).setStrokeStyle(1.5, 0xffedb2, 0.48);
      const sprite = this.add.image(0, 0, 'fish').setDisplaySize(60, 43);
      this.fishViews.push(this.add.container(fish.x, fish.y, [halo, ring, sprite]).setDepth(7));
    }
    this.updateBodies();
  }
  private setAim(x: number, y: number) { if (y < 112 || y > 805 || x < 100) return; this.aim = aimAt(x, y); }
  fire() {
    if (this.paused || this.menu) return;
    this.sfx.unlock();
    if (this.simulation.shoot(this.aim)) {
      this.previousTrace = [...this.trace]; this.trace = []; this.player.setVisible(true); this.publish();
    }
  }
  boost() { if (!this.paused && !this.menu && this.simulation.boost()) this.publish(); }
  private publish() { this.onState({ simulation: this.simulation, aim: this.aim, dragging: this.dragging, paused: this.paused, fps: this.game.loop.actualFps }); }
  private updateBodies() {
    for (const block of this.simulation.blocks) {
      const sprite = this.blocks.get(block.id); if (!sprite) continue;
      sprite.setPosition(block.body.position.x, block.body.position.y).setRotation(block.body.angle).setVisible(!block.broken);
    }
    const p = this.simulation.projectile;
    if (p) this.player.setPosition(p.position.x, p.position.y).setRotation(clamp(p.velocity.y * 0.035, -0.6, 0.9));
    this.target.setPosition(this.simulation.target.position.x, this.simulation.target.position.y - 12).setRotation(this.simulation.target.angle * 0.65);
  }
  update(_time: number, delta: number) {
    if (!this.loaded) return;
    this.renderedFrames++;
    const dt = Math.min(delta, 50) / 1000;
    if (!this.paused || this.menu) this.ambientTime += dt;
    const t = this.ambientTime;
    if (!this.paused && !this.menu) {
      if (this.simulation.phase === 'ready') {
        const adjustment = dt * 0.55;
        if (this.keys.UP?.isDown) this.aim.angle = Math.max(-1.34, this.aim.angle - adjustment);
        if (this.keys.DOWN?.isDown) this.aim.angle = Math.min(-0.13, this.aim.angle + adjustment);
        if (this.keys.LEFT?.isDown) this.aim.power = Math.max(10, this.aim.power - dt * 9);
        if (this.keys.RIGHT?.isDown) this.aim.power = Math.min(28, this.aim.power + dt * 9);
      }
      const rate = this.slowmo > 0 ? 0.35 : 1;
      this.slowmo -= dt; this.accumulator += Math.min(delta, 100) * rate;
      while (this.accumulator >= 1000 / 60) { this.simulation.step(); this.accumulator -= 1000 / 60; }
      for (const event of this.simulation.drainEvents()) this.effect(event);
      this.updateBodies();
      const p = this.simulation.projectile;
      if (p && this.simulation.phase === 'flying') {
        this.trailClock += dt;
        if (this.trailClock > 0.025) {
          this.trailClock = 0; this.trace.push({ ...p.position }); if (this.trace.length > 230) this.trace.shift();
          if (p.speed > 4) this.emit(p.position.x - 25, p.position.y + 5, 'spark', 1, 35, 0.35, 0, 0.22);
        }
      }
      this.updateParticles(dt);
    }
    this.barrel.setRotation(this.aim.angle);
    this.standby.setScale(109 / 320, (87 / 256) * (1 + Math.sin(t * 2) * 0.025));
    this.sleepText.setVisible(!this.simulation.awake).setPosition(this.target.x + 17, this.target.y - 100 + Math.sin(t * 1.7) * 7).setAngle(-8 + Math.sin(t) * 5);
    this.tip.setVisible(this.menu).setPosition(this.target.x, this.target.y - 130);
    this.fishViews.forEach((v, i) => { v.setVisible(!this.simulation.fish[i].collected); v.y = this.simulation.fish[i].y + Math.sin(t * 2.7 + i) * 6; v.rotation = Math.sin(t * 1.8 + i) * 0.09; });
    this.drawAim(t); this.drawTrails(); this.drawAmbience(t);
    if (t - this.lastUi > 0.08) { this.lastUi = t; this.publish(); }
  }
  private drawAim(t: number) {
    this.aimGraphics.clear(); this.aimLabel.setVisible(false);
    if ((this.paused && !this.menu) || this.simulation.phase !== 'ready') return;
    const points = trajectory(this.aim, this.simulation.level.wind);
    const count = this.menu ? 18 : points.length;
    for (let i = 0; i < count; i++) {
      const p = points[i]; if (!p) break;
      const alpha = this.menu ? 0.22 : this.dragging ? 0.83 : 0.58;
      this.aimGraphics.fillStyle(0x385e50, alpha * 0.3).fillCircle(p.x + 1, p.y + 2, Math.max(2, 4.3 - i * 0.045));
      this.aimGraphics.fillStyle(0xfff6d9, alpha).fillCircle(p.x, p.y, Math.max(2, 3.5 - i * 0.045));
    }
    const end = points[points.length - 1];
    if (end && !this.menu) {
      this.aimGraphics.lineStyle(2, 0xffedb0, 0.7).strokeCircle(end.x, end.y, 13 + Math.sin(t * 5) * 2);
      this.aimGraphics.lineBetween(end.x - 20, end.y, end.x + 20, end.y); this.aimGraphics.lineBetween(end.x, end.y - 20, end.x, end.y + 20);
    }
    if (this.dragging) {
      const tip = muzzle(this.aim); this.aimLabel.setVisible(true).setPosition(tip.x + 52, tip.y - 63).setText('ОТПУСКАЙ!');
      this.aimGraphics.lineStyle(7, 0x294c43, 0.2).beginPath().arc(WORLD.cannon.x, WORLD.cannon.y, 115, -1.34, -0.13).strokePath();
      this.aimGraphics.lineStyle(5, 0xffdc87, 1).beginPath().arc(WORLD.cannon.x, WORLD.cannon.y, 115, -1.34, this.aim.angle).strokePath();
    }
  }
  private drawTrails() {
    const g = this.trailGraphics; g.clear();
    for (let i = 0; i < this.previousTrace.length; i += 4) { const p = this.previousTrace[i]; g.fillStyle(0xfff6de, 0.19).fillCircle(p.x, p.y, 2); }
    for (let i = 1; i < this.trace.length; i++) {
      const p = this.trace[i], a = this.trace[i - 1], fade = i / this.trace.length;
      g.lineStyle(2 + 5 * fade, this.simulation.boosted ? 0xffcc76 : 0xfff1c6, 0.05 + fade * 0.4); g.lineBetween(a.x, a.y, p.x, p.y);
    }
  }
  private drawAmbience(t: number) {
    const g = this.ambience; g.clear();
    for (let i = 0; i < 20; i++) {
      const x = (i * 149 + t * (5 + i % 4)) % 1640 - 20, y = 145 + (i * 127) % 560 + Math.sin(t * 0.7 + i) * 17;
      g.fillStyle(0xfff8ce, 0.15 + Math.sin(t + i) * 0.1).fillCircle(x, y, 1.5 + i % 3);
    }
    for (let i = 0; i < 6; i++) {
      const x = ((t * (7 + i) + i * 315) % 1820) - 110, y = 245 + i % 3 * 48 + Math.sin(t * 0.6 + i) * 12, flap = Math.sin(t * 4 + i) * 4;
      g.lineStyle(2, 0x4f7267, 0.55).beginPath().moveTo(x - 9, y + flap).lineTo(x, y + 3).lineTo(x + 9, y + flap).strokePath();
    }
    for (let i = 0; i < 18; i++) {
      const x = 438 + ((i * 97 + t * 13) % 405), y = 772 + i % 6 * 24;
      g.lineStyle(1.5, 0xf7d69d, 0.15 + Math.sin(t + i) * 0.07).lineBetween(x, y, x + 12 + i % 4 * 9, y);
    }
  }
  private emit(x: number, y: number, texture: string, count: number, speed: number, lifetime: number, gravity = 350, scale = 0.6) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 260) this.particles.shift()?.image.destroy();
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7), life = lifetime * (0.65 + Math.random() * 0.7);
      const size = scale * (0.7 + Math.random() * 0.6);
      this.particles.push({ image: this.add.image(x, y, texture).setScale(size / 2).setDepth(19), vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25, life, max: life, spin: (Math.random() - 0.5) * 9, gravity, scale: size / 2 });
    }
  }
  private updateParticles(dt: number) {
    this.particles = this.particles.filter(p => {
      p.life -= dt; if (p.life <= 0) { p.image.destroy(); return false; }
      p.vy += p.gravity * dt; p.image.x += p.vx * dt; p.image.y += p.vy * dt; p.image.rotation += p.spin * dt;
      const fade = Math.min(1, p.life / (p.max * 0.35)); p.image.setAlpha(fade).setScale(p.scale * (0.7 + p.life / p.max * 0.3)); return true;
    });
  }
  private label(x: number, y: number, text: string, color = '#fff3c1', size = 32) {
    const label = this.add.text(x, y, text, { fontFamily: 'Nunito', fontSize: `${size}px`, fontStyle: '1000', color, stroke: '#37584b', strokeThickness: 5 }).setOrigin(0.5).setDepth(25).setAngle(-7);
    this.tweens.add({ targets: label, y: y - 70, alpha: 0, scale: 1.15, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }
  private ring(x: number, y: number, radius: number, color = 0xffe4a1) {
    const circle = this.add.circle(x, y, 20).setStrokeStyle(7, color, 0.9).setDepth(18);
    this.tweens.add({ targets: circle, scale: radius / 20, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => circle.destroy() });
  }
  private effect(event: GameEvent) {
    const { x, y } = event;
    switch (event.type) {
      case 'shot':
        this.sfx.play('shot'); this.emit(x, y, 'puff', 15, 180, 0.7, -40, 0.8); this.emit(x, y, 'spark', 10, 250, 0.5, 180, 0.5);
        this.cameras.main.shake(130, 0.0025);
        this.tweens.add({ targets: this.carriage, x: 222, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
        this.label(x + 35, y - 44, 'МЯУ!', '#fff0c7', 31); break;
      case 'boost':
        this.sfx.play('boost'); this.ring(x, y, 200); this.emit(x, y, 'spark', 28, 410, 0.8, 50, 0.7); this.emit(x, y, 'puff', 14, 260, 0.7, 0, 0.9);
        this.cameras.main.shake(200, 0.004); this.label(x, y - 55, 'МЯУ-РЫВОК!', '#ffdc85', 38); break;
      case 'impact':
        this.sfx.play('hit', event.force); this.emit(x, y, 'puff', Math.min(9, Math.ceil(event.force)), 110, 0.5, -15, 0.45);
        if (event.force > 5) { this.cameras.main.shake(120, Math.min(0.004, event.force * 0.00025)); this.emit(x, y, 'spark', 5, 170, 0.5, 200, 0.4); }
        break;
      case 'break':
        this.sfx.play('break'); this.emit(x, y, event.material === 'glass' ? 'spark' : 'chip', 13, 240, 1.2, 490, 0.8); this.emit(x, y, 'puff', 5, 95, 0.6, -25, 0.8); break;
      case 'fish':
        this.sfx.play('fish'); this.emit(x, y, 'spark', 16, 170, 0.8, 30, 0.65); this.label(x, y - 22, '+250', '#ffdf88', 28); break;
      case 'wake':
        this.sfx.play('wake'); this.target.setTexture('awake'); this.slowmo = 0.8;
        this.cameras.main.shake(200, 0.004); this.ring(x, y, 140); this.label(x, y - 85, 'Я НЕ СПАЛ!', '#fff3c6', 34);
        this.emit(x, y - 40, 'spark', 35, 340, 1.7, 160, 0.9); break;
      case 'win':
        if (!this.resultSent) { this.resultSent = true; this.sfx.play('win'); this.onResult(this.simulation); this.emit(800, 230, 'leaf', 70, 570, 4, 90, 1); }
        break;
      case 'lose': if (!this.resultSent) { this.resultSent = true; this.sfx.play('lose'); this.onResult(this.simulation); } break;
    }
  }
  debugState() {
    return { phase: this.simulation.phase, level: this.simulation.levelIndex, shots: this.simulation.spent, fish: this.simulation.collected, score: this.simulation.score, stars: this.simulation.stars, awake: this.simulation.awake, boosted: this.simulation.boosted, paused: this.paused, aim: this.aim, target: { ...this.simulation.target.position }, projectile: this.simulation.projectile ? { ...this.simulation.projectile.position } : null, blocks: this.simulation.blocks.filter(b => !b.broken).length, particles: this.particles.length, renderedFrames: this.renderedFrames, fps: this.game.loop.actualFps, justTouch: this.justTouch };
  }
}
