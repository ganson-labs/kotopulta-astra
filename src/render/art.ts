import Phaser from 'phaser';
type Ctx = CanvasRenderingContext2D;
const INK = '#34473f';
function path(c: Ctx, d: string, fill: string, stroke = INK, width = 3) { const p = new Path2D(d); c.fillStyle = fill; c.fill(p); if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(p); } }
function oval(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = '', width = 3) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); } }
function line(c: Ctx, d: string, color = INK, width = 3) { c.strokeStyle = color; c.lineWidth = width; c.stroke(new Path2D(d)); }
function rect(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = '') { c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 3; c.stroke(); } }
function texture(scene: Phaser.Scene, name: string, w: number, h: number, draw: (c: Ctx) => void) {
  const canvas = document.createElement('canvas'); canvas.width = w * 2; canvas.height = h * 2;
  const c = canvas.getContext('2d'); if (!c) throw new Error('Canvas 2D unavailable');
  c.scale(2, 2); c.lineCap = 'round'; c.lineJoin = 'round'; draw(c); scene.textures.addCanvas(name, canvas);
}
function cat(c: Ctx, asleep: boolean, pilot: boolean) {
  c.save(); c.translate(pilot ? 0 : 10, pilot ? -1 : 8);
  line(c, 'M45 93 Q8 100 16 68 Q21 53 30 68', '#d98f49', 16);
  line(c, 'M45 94 Q9 100 16 69', INK, 3);
  oval(c, 81, 91, 42, 29, pilot ? '#efa650' : '#e7c694', INK);
  oval(c, 89, 94, 26, 21, '#fff0cd');
  oval(c, 63, 112, 17, 8, '#f3bb70', INK, 2.5); oval(c, 110, 110, 17, 8, '#f3bb70', INK, 2.5);
  path(c, 'M41 53 L39 13 Q53 16 65 33 L94 32 Q104 16 119 13 L118 60Z', '#efa650');
  path(c, 'M47 36 L47 24 L62 41Z M101 39 L113 23 L112 43Z', '#d98070', '', 0);
  oval(c, 81, 60, 45, 35, pilot ? '#f5b566' : '#efcd9d', INK);
  path(c, 'M66 27 L70 42 L76 27 M84 26 L85 41 L91 27', '#cd813d', '', 0);
  oval(c, 72, 75, 15, 12, '#fff0d4'); oval(c, 93, 75, 15, 12, '#fff0d4');
  if (pilot) {
    line(c, 'M39 52 Q81 45 123 53', '#866344', 11);
    oval(c, 62, 54, 19, 18, '#487977', '#354f48', 4); oval(c, 102, 54, 19, 18, '#487977', '#354f48', 4);
    oval(c, 62, 54, 14, 13, '#98d7c8'); oval(c, 102, 54, 14, 13, '#98d7c8');
    oval(c, 66, 55, 5, 7, '#2d463e'); oval(c, 106, 55, 5, 7, '#2d463e');
    line(c, 'M53 49 L62 44 M93 49 L102 44', '#ecf8df', 3);
    line(c, 'M81 52 L83 52', '#b59055', 5);
    path(c, 'M46 88 Q81 98 115 86 L116 98 Q83 109 47 99Z', '#e27962');
    path(c, 'M49 92 Q22 87 7 98 L21 107 L12 115 Q42 114 57 101Z', '#e27962');
  } else if (asleep) {
    line(c, 'M53 60 Q62 67 71 60 M92 60 Q101 67 110 60', INK, 3.5);
  } else {
    oval(c, 62, 59, 10, 12, '#fff4dc'); oval(c, 101, 59, 10, 12, '#fff4dc');
    oval(c, 64, 60, 4, 7, INK); oval(c, 103, 60, 4, 7, INK);
  }
  path(c, 'M76 70 Q82 66 88 70 L82 76Z', '#a5685b', '', 0);
  line(c, 'M82 76 Q81 85 74 81 M82 76 Q84 85 92 80', INK, 2.5);
  line(c, 'M52 72 L31 68 M52 78 L29 81 M110 72 L131 68 M112 78 L134 82', '#7f7456', 2);
  oval(c, 52, 75, 7, 3, '#e98f6d'); oval(c, 112, 75, 7, 3, '#e98f6d');
  line(c, 'M55 111 L55 115 M63 113 L63 117 M104 111 L104 114 M112 110 L112 114', '#bd894e', 2);
  c.restore();
}
export function buildArt(scene: Phaser.Scene) {
  texture(scene, 'pilot', 160, 128, c => cat(c, false, true));
  texture(scene, 'sleepy', 180, 144, c => cat(c, true, false));
  texture(scene, 'awake', 180, 144, c => cat(c, false, false));
  texture(scene, 'barrel', 180, 100, c => {
    const g = c.createLinearGradient(0, 15, 0, 82); g.addColorStop(0, '#74b4a0'); g.addColorStop(0.48, '#347a70'); g.addColorStop(1, '#214d48');
    c.fillStyle = g; const p = new Path2D('M29 21 Q7 23 10 52 Q11 80 36 81 L145 74 L149 27Z'); c.fill(p); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(p);
    path(c, 'M42 22 L53 23 L58 80 L45 80Z', '#eac581'); path(c, 'M127 27 L140 27 L139 75 L127 76Z', '#eac581');
    oval(c, 148, 51, 18, 30, '#346b61', INK, 4); oval(c, 152, 51, 11, 22, '#1d3935');
    line(c, 'M62 33 L116 36', '#9ad0b2', 3);
    path(c, 'M75 55 Q89 39 104 54 Q89 69 75 55 L68 46 L68 63Z', '#e8c484', '', 0);
    oval(c, 98, 53, 2, 2, '#4e6753');
    oval(c, 28, 49, 5, 5, '#ebc887', INK, 2);
    line(c, 'M14 31 Q-1 11 9 7', '#60472e', 3);
    oval(c, 10, 7, 4, 4, '#efb451');
  });
  texture(scene, 'carriage', 166, 115, c => {
    path(c, 'M38 76 L60 24 L94 24 L132 78Z', '#ce8960');
    path(c, 'M60 24 L70 27 L53 79 L39 79Z', '#efc790', INK, 2);
    rect(c, 20, 69, 132, 19, 4, '#cb9366', INK);
    for (const x of [42, 128]) {
      oval(c, x, 85, 26, 26, '#426458', INK, 4); oval(c, x, 85, 19, 19, '#b68f5e', '#eac687', 3);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(c, `M${x} 85 L${x + Math.cos(a) * 17} ${85 + Math.sin(a) * 17}`, '#6d6242', 3); }
      oval(c, x, 85, 6, 6, '#f2d197', INK, 2);
    }
    oval(c, 76, 37, 9, 9, '#efd08f', INK, 3);
  });
  for (const material of ['wood', 'teal', 'glass']) {
    texture(scene, `crate-${material}`, 128, 128, c => {
      if (material === 'glass') {
        rect(c, 4, 4, 120, 120, 8, '#9ccdc4dd', '#397d73');
        rect(c, 11, 11, 106, 106, 4, '#a6e3d066', '#d0eed6');
        path(c, 'M14 86 L82 15 L105 15 L15 110Z M46 115 L115 46 L115 61 L62 115Z', '#e5f8db77', '', 0);
        line(c, 'M21 30 L21 19 L39 19 M108 94 L108 109 L95 109', '#effee8', 4);
        return;
      }
      const teal = material === 'teal';
      rect(c, 4, 4, 120, 120, 7, teal ? '#558678' : '#d8a362', '#5c5841');
      rect(c, 10, 10, 108, 108, 3, teal ? '#6d9e87' : '#eabe79');
      rect(c, 14, 16, 100, 94, 2, teal ? '#609281' : '#deb071');
      for (let i = 0; i < 6; i++) {
        const y = 22 + i * 17; line(c, `M16 ${y} Q39 ${y + 3} 59 ${y} T111 ${y + 2}`, teal ? '#4f7f71' : '#c49660', 1.5);
      }
      path(c, 'M53 9 L75 9 L75 117 L53 117Z', teal ? '#d8c78e' : '#f4d493', '', 0);
      for (let y = 14; y < 112; y += 12) line(c, `M55 ${y} L60 ${y + 5}`, '#a99567', 1.5);
      line(c, 'M12 10 L116 10 M10 13 L10 112', teal ? '#a3c5a1' : '#ffe1a2', 3);
      rect(c, 82, 77, 28, 28, 2, '#f6e5bd');
      path(c, 'M88 91 Q96 81 105 91 Q96 102 88 91 L84 86 L84 97Z', teal ? '#527970' : '#aa8052', '', 0);
      for (const [x, y] of [[18, 17], [110, 17], [18, 110], [110, 110]]) oval(c, x, y, 2, 2, '#786044');
    });
  }
  texture(scene, 'fish', 86, 62, c => {
    c.shadowColor = '#ffe6a0'; c.shadowBlur = 12;
    path(c, 'M23 31 Q47 0 73 30 Q48 61 23 31 L8 16 L8 47Z', '#ffd77b', '#ac783e', 3);
    c.shadowBlur = 0; path(c, 'M43 14 L51 5 L57 15Z', '#ffe7a5', '#ac783e', 2);
    line(c, 'M50 16 Q40 30 52 46', '#d89e48', 2); oval(c, 61, 27, 3, 4, '#594d33');
    line(c, 'M30 27 Q39 16 46 18', '#fff5c5', 3);
  });
  texture(scene, 'spark', 32, 32, c => path(c, 'M16 0 L20 11 L32 16 L21 20 L16 32 L11 21 L0 16 L11 11Z', '#fff1b5', '', 0));
  texture(scene, 'puff', 64, 64, c => {
    oval(c, 28, 32, 24, 22, '#fff2d4'); oval(c, 40, 23, 18, 17, '#fff2d4'); oval(c, 41, 39, 16, 17, '#fff2d4');
  });
  texture(scene, 'chip', 30, 18, c => path(c, 'M2 4 L26 1 L29 14 L5 17Z', '#e1b171', '#a47748', 1));
  texture(scene, 'leaf', 40, 24, c => { path(c, 'M1 21 Q11 -4 37 3 Q35 21 1 21Z', '#bd9b57', '', 0); line(c, 'M2 20 L29 7', '#edcc83', 1); });
  texture(scene, 'dock', 1600, 220, c => {
    for (const [x, w] of [[-20, 456], [850, 780]]) {
      rect(c, x, 25, w, 36, 4, '#4b6258', '#304b43');
      rect(c, x, 6, w, 31, 3, '#bd9162', '#6c6750');
      line(c, `M${x} 9 L${x + w} 9`, '#f1d59c', 5);
      for (let xx = x + 5; xx < x + w - 8; xx += 61) {
        line(c, `M${xx} 12 L${xx - 4} 34`, '#7a7454', 2);
        line(c, `M${xx + 9} 19 L${xx + 42} 20`, '#ddbc86', 2);
        oval(c, xx + 12, 29, 2, 2, '#75674a');
      }
      for (let xx = x + 63; xx < x + w; xx += 240) {
        path(c, `M${xx} 49 L${xx + 33} 49 L${xx + 22} 220 L${xx + 3} 220Z`, '#38584e');
        line(c, `M${xx + 9} 63 L${xx + 9} 181`, '#658071', 4);
        rect(c, xx - 6, 55, 46, 12, 3, '#8a916b');
        line(c, `M${xx + 28} 92 L${xx + 153} 41`, '#466052', 13);
      }
    }
  });
  texture(scene, 'bollard', 90, 95, c => {
    oval(c, 46, 83, 40, 9, '#2d514740');
    path(c, 'M30 23 Q41 11 59 23 L64 79 Q45 88 28 79Z', '#567365');
    oval(c, 45, 22, 22, 9, '#829582', INK, 3);
    for (let y = 43; y < 62; y += 6) line(c, `M25 ${y} Q44 ${y + 12} 66 ${y + 1}`, '#dfc88e', 5);
  });
  texture(scene, 'bunting', 1600, 150, c => {
    line(c, 'M-20 20 Q230 179 480 12 M1130 -14 Q1400 155 1630 10', '#5d695140', 2);
    const colors = ['#bc785d', '#648e7c', '#c2a163', '#d5b67d'];
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 52, y = 29 + Math.sin((x / 490) * Math.PI) * 60;
      path(c, `M${x} ${y} L${x + 25} ${y + 8} L${x + 7} ${y + 39}Z`, colors[i % 4], '', 0);
    }
    for (let i = 0; i < 9; i++) {
      const x = 1160 + i * 53, y = 10 + Math.sin((i / 8) * Math.PI) * 68;
      path(c, `M${x} ${y} L${x + 26} ${y + 4} L${x + 13} ${y + 32}Z`, colors[(i + 1) % 4], '', 0);
    }
  });
}
