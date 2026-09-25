import type { HarborScene, ViewState } from '../render/HarborScene';
import type { Simulation } from '../game/simulation';
import { LEVELS } from '../game/levels';
import { readSave, writeSave, type Save } from '../game/save';
import type { Soundscape } from '../audio/sound';

const icons = {
  fish: '<path d="M7 12q8-12 16 0-8 12-16 0L1 6v12Z"/><circle cx="18" cy="11" r="1" fill="currentColor" stroke="none"/>',
  sound: '<path d="M3 9h4l5-5v16l-5-5H3Z"/><path d="M16 8q5 4 0 8m3-11q8 7 0 14" fill="none"/>',
  mute: '<path d="M3 9h4l5-5v16l-5-5H3Z"/><path d="m17 9 6 6m0-6-6 6" fill="none"/>',
  full: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" fill="none"/>',
  pause: '<path d="M7 5v14M17 5v14" stroke-width="4"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6" fill="none"/>',
  replay: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" fill="none"/>',
  close: '<path d="m6 6 12 12M6 18 18 6" fill="none"/>',
  cat: '<path d="m4 11 0-8 7 5h3l7-5v9q1 10-9 10T4 11Z"/><path d="M8 13h1m7 0h1m-6 4q1 2 3 0" fill="none"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
  grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
  bolt: '<path d="m14 2-9 12h6l-1 8 9-12h-6Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none"/>',
};
export const icon = (name: keyof typeof icons, css = '') => `<svg class="icon ${css}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
function required<T extends Element>(parent: ParentNode, selector: string, type: { new(...args: never[]): T }): T {
  const element = parent.querySelector(selector); if (!(element instanceof type)) throw new Error(`Missing UI element ${selector}`); return element;
}
export class Interface {
  readonly save: Save = readSave();
  private readonly root: HTMLElement;
  private readonly home: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly overlay: HTMLElement;
  private screen: 'home' | 'game' | 'levels' | 'pause' | 'result' = 'home';
  private returnTo: 'home' | 'game' = 'home';
  private lastResult: Simulation | null = null;
  constructor(private readonly scene: HarborScene, private readonly sound: Soundscape) {
    this.root = required(document, '#ui', HTMLElement);
    this.sound.muted = this.save.muted;
    this.root.innerHTML = `
      <div id="loading"><div class="loading-cat">${icon('cat')}</div><p>Прогреваем котопульту<span>…</span></p></div>
      <header class="brand"><span class="brand-mark">${icon('cat')}</span><span>КОТОПУЛЬТА<small>СОН ОТМЕНЯЕТСЯ</small></span></header>
      <nav class="toolbar" aria-label="Настройки"><button class="icon-button" id="sound" title="Звук (M)" aria-label="Выключить звук">${icon('sound')}</button><button class="icon-button" id="fullscreen" title="Полный экран (F)" aria-label="Полный экран">${icon('full')}</button><button class="icon-button" id="pause" title="Пауза (Esc)" aria-label="Пауза" hidden>${icon('pause')}</button></nav>
      <section id="home" hidden>
        <div class="hero-backdrop"></div>
        <div class="hero-copy"><div class="eyebrow"><span></span> УЮТНАЯ ИГРА. ГРОМКИЕ КОТЫ.</div>
          <h1><span>КОТО</span><span>ПУЛЬТА<span class="title-dot">.</span></span></h1>
          <p class="hero-description">У всех в гавани тихий час.<br>У тебя — пушка и другие планы.</p>
          <div class="home-actions"><button class="button primary" id="play">Полетели ${icon('arrow')}</button><button class="button secondary" id="levels">${icon('grid')} Уровни</button></div>
          <div class="hero-note"><span class="mouse-shape"></span> Прицелься. Отпусти. Устрой мяу.</div>
        </div>
        <div class="round-note"><span>8</span>уютных<br>катастроф<i>✦</i></div>
        <div class="origin-note"><span>✎</span> Нарисовано на бумаге. Оживлено из любопытства.</div>
        <div class="home-credit">МАЛЕНЬКОЕ ПРИКЛЮЧЕНИЕ ПАШИ ГАНСОНА</div>
      </section>
      <section id="hud" hidden>
        <div class="level-heading"><span id="level-number">01 / 08</span><div><small id="level-subtitle"></small><h2 id="level-name"></h2></div></div>
        <div class="objective"><span class="sleep-dot"></span><span id="objective-text">Разбуди соню!</span></div>
        <div class="counters"><div class="counter"><span class="counter-label">ПОПЫТКИ</span><span id="shots"></span></div><div class="counter"><span class="counter-label">УЛОВ</span><span id="fish"></span></div><div class="score-counter"><span class="counter-label">ОЧКИ</span><strong id="score">0</strong></div></div>
        <div class="bottom-bar"><div class="aim-readout"><div><span>УГОЛ</span><b id="angle">37°</b></div><div class="power"><span>СИЛА <b id="power-number">48%</b></span><div class="power-track"><i id="power-fill"></i></div></div><button id="retry" class="mini-button" title="Заново (R)" aria-label="Начать уровень заново">${icon('replay')}</button></div>
        <div class="play-hint" id="play-hint">Зажми <span>→</span> наведи <span>→</span> отпусти<small>↑ ↓ угол &nbsp; · &nbsp; ← → сила &nbsp; · &nbsp; пробел — выстрел</small></div>
        <button id="boost" class="boost-button" disabled>${icon('bolt')}<span>Мяу-рывок<small>ОДИН РАЗ ЗА ПОЛЁТ</small></span><kbd>ПРОБЕЛ</kbd></button></div>
      </section>
      <div id="overlay" hidden></div>
      <div class="rotate-notice">${icon('full')} Поверни телефон — гавани нужен простор</div>
      <div id="toast" role="status" aria-live="polite"></div>
    `;
    this.home = required(this.root, '#home', HTMLElement); this.hud = required(this.root, '#hud', HTMLElement); this.overlay = required(this.root, '#overlay', HTMLElement);
    this.bind('play', () => this.play(this.nextLevel()));
    this.bind('levels', () => this.showLevels('home'));
    this.bind('retry', () => this.play(this.scene.simulation.levelIndex));
    this.bind('boost', () => this.scene.boost());
    this.bind('sound', () => this.toggleSound());
    this.bind('fullscreen', () => void this.fullscreen());
    this.bind('pause', () => this.pause());
    this.scene.onReady = () => { required(this.root, '#loading', HTMLElement).hidden = true; this.home.hidden = false; this.updateSound(); };
    this.scene.onState = state => this.update(state);
    this.scene.onResult = sim => this.result(sim);
    this.scene.onPause = () => this.screen === 'pause' ? this.resume() : this.pause();
    document.addEventListener('keydown', event => {
      if (event.repeat) return;
      if (event.code === 'KeyM') this.toggleSound();
      if (event.code === 'KeyF') void this.fullscreen();
      if (event.code === 'Escape' && this.screen === 'levels') this.closeLevels();
      if (event.code === 'Enter') {
        if (this.screen === 'home') this.play(this.nextLevel());
        else if (this.screen === 'result' && this.lastResult) this.play(this.lastResult.phase === 'won' ? Math.min(7, this.lastResult.levelIndex + 1) : this.lastResult.levelIndex);
      }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.screen === 'game') this.pause(); });
    window.addEventListener('blur', () => { if (this.screen === 'game') this.pause(); });
  }
  private bind(id: string, action: () => void) { required(this.root, `#${id}`, HTMLButtonElement).addEventListener('click', () => { this.sound.unlock(); this.sound.play('click'); action(); }); }
  private nextLevel() { const n = this.save.stars.findIndex(v => v === 0); return n === -1 ? 0 : n; }
  private play(index: number) {
    this.screen = 'game'; this.home.hidden = true; this.overlay.hidden = true; this.hud.hidden = false;
    this.root.classList.add('playing'); required(this.root, '#pause', HTMLButtonElement).hidden = false;
    this.scene.startLevel(index);
    this.toast(LEVELS[index].hint);
  }
  private update({ simulation: sim, aim, dragging }: ViewState) {
    if (this.screen === 'home') return;
    required(this.root, '#level-number', HTMLElement).textContent = `${String(sim.levelIndex + 1).padStart(2, '0')} / 08`;
    required(this.root, '#level-name', HTMLElement).textContent = sim.level.name;
    required(this.root, '#level-subtitle', HTMLElement).textContent = sim.level.subtitle;
    const shots = required(this.root, '#shots', HTMLElement), fish = required(this.root, '#fish', HTMLElement);
    const shotsValue = String(sim.shotsLeft), fishValue = String(sim.collected);
    if (shots.dataset.value !== shotsValue) { shots.dataset.value = shotsValue; shots.innerHTML = Array.from({ length: sim.level.shots }, (_, i) => icon('cat', i >= sim.shotsLeft ? 'empty' : '')).join(''); }
    if (fish.dataset.value !== fishValue) { fish.dataset.value = fishValue; fish.innerHTML = [0, 1, 2].map(i => icon('fish', i >= sim.collected ? 'empty' : '')).join(''); }
    required(this.root, '#score', HTMLElement).textContent = sim.score.toLocaleString('ru-RU');
    required(this.root, '#angle', HTMLElement).textContent = `${Math.round(-aim.angle * 180 / Math.PI)}°`;
    const power = Math.round((aim.power - 10) / 18 * 100);
    required(this.root, '#power-number', HTMLElement).textContent = `${power}%`;
    required(this.root, '#power-fill', HTMLElement).style.width = `${power}%`;
    const boost = required(this.root, '#boost', HTMLButtonElement);
    boost.disabled = sim.phase !== 'flying' || sim.boosted || sim.awake;
    boost.classList.toggle('available', !boost.disabled);
    required(this.root, '#objective-text', HTMLElement).textContent = sim.awake ? 'Вот теперь доброе утро!' : sim.phase === 'flying' ? 'Доставка кота…' : 'Разбуди соню!';
    required(this.root, '#play-hint', HTMLElement).innerHTML = sim.phase === 'flying'
      ? (sim.boosted ? 'Красиво летим!<small>Смотри, как коробки теряют самообладание</small>' : 'Самое время для рывка<small>Пробел или клик — толкнуть коробки и собрать рыбок</small>')
      : `${dragging ? 'Отпусти — и полетели!' : 'Зажми <span>→</span> наведи <span>→</span> отпусти'}<small>↑ ↓ угол &nbsp; · &nbsp; ← → сила &nbsp; · &nbsp; пробел — выстрел</small>`;
  }
  private pause() {
    if (this.screen !== 'game') return;
    this.screen = 'pause'; this.scene.setPaused(true); this.overlay.hidden = false;
    this.overlay.innerHTML = `<section class="modal pause-modal"><div class="modal-eyebrow">ПУШКА ОСТЫНЕТ. КОТ ПОДОЖДЁТ.</div><h2>Перекур<span>рр.</span></h2><p>Пауза — тоже кошачье искусство.</p><button id="resume" class="button primary">Продолжить ${icon('arrow')}</button><div class="modal-actions"><button id="pause-retry" class="button secondary">${icon('replay')} Заново</button><button id="pause-levels" class="button secondary">${icon('grid')} Уровни</button></div><div class="control-guide"><div><b>Мышь / касание</b><span>Зажми, наведи, отпусти</span></div><div><b>Пробел / клик в полёте</b><span>Мяу-рывок</span></div><div><b>Стрелки</b><span>Угол и сила выстрела</span></div><div><b>R · M · F · Esc</b><span>Заново · звук · экран · пауза</span></div></div><button id="home-link" class="text-button">На главную</button></section>`;
    this.bind('resume', () => this.resume()); this.bind('pause-retry', () => this.play(this.scene.simulation.levelIndex)); this.bind('pause-levels', () => this.showLevels('game')); this.bind('home-link', () => this.showHome());
    required(this.root, '#resume', HTMLButtonElement).focus();
  }
  private resume() { this.screen = 'game'; this.overlay.hidden = true; this.scene.setPaused(false); }
  private showHome() {
    this.screen = 'home'; this.overlay.hidden = true; this.hud.hidden = true; this.home.hidden = false; this.root.classList.remove('playing');
    required(this.root, '#pause', HTMLButtonElement).hidden = true;
    this.scene.startLevel(0); this.scene.menu = true; this.scene.setPaused(true); this.scene.menu = true; this.sound.setActive(true);
  }
  private showLevels(from: 'home' | 'game') {
    this.screen = 'levels'; this.returnTo = from; this.scene.setPaused(true); this.overlay.hidden = false;
    const unlocked = Math.min(7, this.nextLevel() === 0 && this.save.stars[7] > 0 ? 7 : this.nextLevel());
    this.overlay.innerHTML = `<section class="modal level-modal"><button id="close-levels" class="icon-button modal-close" aria-label="Закрыть">${icon('close')}</button><div class="modal-eyebrow">ОДНА ГАВАНЬ. МНОГО СОННЫХ КОТОВ.</div><h2>Карта беспорядка</h2><p>${this.save.stars.reduce((a, b) => a + b, 0)} из 24 звёзд · лучшие результаты сохраняются</p><div class="level-grid">${LEVELS.map((l, i) => `<button class="level-card ${i > unlocked ? 'locked' : ''}" id="level-${i}" ${i > unlocked ? 'disabled' : ''}><span class="level-card-number">${i > unlocked ? icon('lock') : String(i + 1).padStart(2, '0')}</span><strong>${l.name}</strong><small>${l.subtitle}</small><span class="small-stars">${[1, 2, 3].map(n => icon('star', this.save.stars[i] >= n ? 'earned' : '')).join('')}</span></button>`).join('')}</div><div class="star-rule">${icon('star')} Разбуди кота <span>·</span> ${icon('fish')} Собери 2 рыбки <span>·</span> ${icon('bolt')} Справься за 1 выстрел</div></section>`;
    this.bind('close-levels', () => this.closeLevels());
    LEVELS.forEach((_l, i) => this.bind(`level-${i}`, () => this.play(i)));
  }
  private closeLevels() { if (this.returnTo === 'home') this.showHome(); else { this.screen = 'game'; this.pause(); } }
  private result(sim: Simulation) {
    this.lastResult = sim; this.screen = 'result'; this.overlay.hidden = false;
    const won = sim.phase === 'won', finale = won && sim.levelIndex === 7;
    if (won) { this.save.stars[sim.levelIndex] = Math.max(this.save.stars[sim.levelIndex], sim.stars); this.save.best[sim.levelIndex] = Math.max(this.save.best[sim.levelIndex], sim.score); writeSave(this.save); }
    this.overlay.innerHTML = `<section class="modal result-modal ${won ? 'won' : 'lost'}"><div class="result-sticker">${icon(won ? 'cat' : 'replay')}</div><div class="modal-eyebrow">${finale ? 'ВСЕ ВОСЕМЬ УРОВНЕЙ ПРОЙДЕНЫ' : won ? 'ТИХИЙ ЧАС ОФИЦИАЛЬНО ОКОНЧЕН' : 'КОТ ВСЁ ЕЩЁ ВИДИТ СНЫ'}</div><h2>${finale ? 'Гавань проснулась!' : won ? 'Вот это мяу!' : 'Ещё по котику?'}</h2><p>${won ? 'Коробки в шоке. Кот — тоже. Ты великолепен.' : 'Чуть другой угол — и всё получится.'}</p><div class="result-stars">${[1, 2, 3].map(n => icon('star', sim.stars >= n ? 'earned' : '')).join('')}</div><div class="result-stats"><div><span>ОЧКИ</span><b>${sim.score.toLocaleString('ru-RU')}</b></div><div><span>РЫБКИ</span><b>${sim.collected}<small> / 3</small></b></div><div><span>ВЫСТРЕЛЫ</span><b>${sim.spent}</b></div></div><div class="result-checks"><span class="${sim.awake ? 'done' : ''}">✓ Разбудить кота</span><span class="${sim.collected >= 2 ? 'done' : ''}">✓ 2 рыбки</span><span class="${sim.spent === 1 && won ? 'done' : ''}">✓ 1 выстрел</span></div><button id="result-next" class="button primary">${finale ? 'Ещё приключений' : won ? 'Следующий уровень' : 'Попробовать ещё'} ${icon(won ? 'arrow' : 'replay')}</button><div class="modal-actions"><button id="result-retry" class="text-button">${icon('replay')} Переиграть</button><button id="result-levels" class="text-button">${icon('grid')} Все уровни</button></div></section>`;
    this.bind('result-next', () => finale ? this.showLevels('home') : this.play(won ? sim.levelIndex + 1 : sim.levelIndex));
    this.bind('result-retry', () => this.play(sim.levelIndex)); this.bind('result-levels', () => this.showLevels('home'));
    required(this.root, '#result-next', HTMLButtonElement).focus();
  }
  private toggleSound() { this.save.muted = this.sound.toggle(); writeSave(this.save); this.updateSound(); }
  private updateSound() { const button = required(this.root, '#sound', HTMLButtonElement); button.innerHTML = icon(this.save.muted ? 'mute' : 'sound'); button.setAttribute('aria-label', this.save.muted ? 'Включить звук' : 'Выключить звук'); button.setAttribute('aria-pressed', String(!this.save.muted)); }
  private async fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { this.toast('Полноэкранный режим: нажми F11 в браузере'); }
  }
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private toast(message: string) { const el = required(this.root, '#toast', HTMLElement); if (this.toastTimer) clearTimeout(this.toastTimer); el.textContent = message; el.classList.add('show'); this.toastTimer = setTimeout(() => el.classList.remove('show'), 5000); }
}
