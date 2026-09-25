import Phaser from 'phaser';
import './style.css';
import { HarborScene } from './render/HarborScene';
import { Soundscape } from './audio/sound';
import { Interface } from './ui/interface';

const sound = new Soundscape();
const scene = new HarborScene(sound);
new Interface(scene, sound);
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 1600, height: 900,
  backgroundColor: '#efd099', scene, antialias: true,
  render: { pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
  input: { activePointers: 2 }, audio: { noAudio: true },
  // Keep high-refresh rendering smooth; physics has its own fixed 60 Hz step.
  fps: { target: 60, limit: 90, forceSetTimeOut: false, smoothStep: false },
});
const stage = document.querySelector<HTMLElement>('#stage');
function resize() {
  if (!stage) return;
  const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
  stage.style.transform = `scale(${scale})`;
  // Phaser recalculates pointer coordinates after CSS scaling.
  game.scale.updateBounds();
}
window.addEventListener('resize', resize); resize();
// Read-only observability for reproducible playtests; no gameplay cheats are shipped.
Object.defineProperty(window, '__CATAPULT__', { value: { state: () => scene.debugState() }, writable: false });
window.addEventListener('pagehide', () => sound.destroy(), { once: true });
