export type Material = 'wood' | 'teal' | 'glass';
export interface BlockSpec { x: number; y: number; w: number; h: number; material: Material }
export interface Level { name: string; subtitle: string; hint: string; blocks: BlockSpec[]; target: { x: number; y: number }; fish: { x: number; y: number }[]; shots: number; wind: number }
const box = (x: number, y: number, w = 88, h = 88, material: Material = 'wood'): BlockSpec => ({ x, y, w, h, material });
export const LEVELS: Level[] = [
  { name: 'Тихий час', subtitle: 'Рыбная гавань', hint: 'Наведи мышь и зажми кнопку. Отпусти — и полетели!', shots: 3, wind: 0,
    blocks: [box(1138, 700), box(1228, 700), box(1318, 700), box(1183, 612), box(1273, 612), box(1228, 524)],
    target: { x: 1228, y: 445 }, fish: [{ x: 665, y: 365 }, { x: 945, y: 346 }, { x: 1338, y: 497 }] },
  { name: 'Хрупкие сны', subtitle: 'Стеклянная пристань', hint: 'Бирюзовое стекло разлетается с одного хорошего попадания.', shots: 3, wind: 0,
    blocks: [box(1120, 686, 56, 116, 'glass'), box(1320, 686, 56, 116, 'glass'), box(1220, 614, 290, 28), box(1165, 553), box(1275, 553), box(1220, 495, 218, 28, 'teal')],
    target: { x: 1220, y: 444 }, fish: [{ x: 680, y: 335 }, { x: 1000, y: 393 }, { x: 1220, y: 671 }] },
  { name: 'Коробочный небоскрёб', subtitle: 'Выше только чайки', hint: 'Чем выше башня, тем веселее её падение. Целься в основание.', shots: 3, wind: 0,
    blocks: [box(1240, 700), box(1240, 612, 88, 88, 'teal'), box(1240, 524), box(1240, 436, 88, 88, 'glass'), box(1240, 348), box(1138, 700), box(1342, 700)],
    target: { x: 1240, y: 270 }, fish: [{ x: 700, y: 310 }, { x: 1080, y: 460 }, { x: 1358, y: 364 }] },
  { name: 'Два берега', subtitle: 'Доставка с ветерком', hint: 'Пробел в полёте — один мощный мяу-рывок. Выбери момент!', shots: 3, wind: 0.000012,
    blocks: [box(970, 700, 72, 88), box(970, 612, 72, 88, 'glass'), box(1240, 690, 60, 108, 'teal'), box(1410, 690, 60, 108, 'teal'), box(1325, 622, 245, 28), box(1325, 564)],
    target: { x: 1325, y: 485 }, fish: [{ x: 688, y: 347 }, { x: 1070, y: 325 }, { x: 1325, y: 685 }] },
  { name: 'Рыбный экспресс', subtitle: 'Осторожно, ценный груз', hint: 'Рывок собирает рыбок рядом с котом и толкает коробки.', shots: 3, wind: -0.000009,
    blocks: [box(1100, 700), box(1320, 700), box(1210, 642, 320, 28), box(1150, 584, 70, 88, 'glass'), box(1270, 584, 70, 88, 'glass'), box(1210, 526, 260, 28, 'teal')],
    target: { x: 1210, y: 476 }, fish: [{ x: 775, y: 410 }, { x: 1210, y: 587 }, { x: 1210, y: 704 }] },
  { name: 'Кот на маяке', subtitle: 'Место под солнцем', hint: 'Высокая дуга или удар снизу? У каждого кота свой стиль.', shots: 3, wind: 0.000009,
    blocks: [box(1300, 690, 140, 108, 'teal'), box(1260, 594, 52, 84, 'glass'), box(1340, 594, 52, 84, 'glass'), box(1300, 538, 190, 28), box(1300, 480), box(1300, 392), box(1300, 334, 140, 28, 'teal')],
    target: { x: 1300, y: 284 }, fish: [{ x: 770, y: 287 }, { x: 1145, y: 350 }, { x: 1418, y: 500 }] },
  { name: 'Большой переезд', subtitle: 'Коробок много не бывает', hint: 'Падающие коробки тоже могут разбудить соню.', shots: 3, wind: -0.000008,
    blocks: [box(1010, 700), box(1100, 700), box(1190, 700), box(1280, 700), box(1370, 700), box(1055, 612, 88, 88, 'glass'), box(1235, 612), box(1325, 612, 88, 88, 'teal'), box(1145, 524, 268, 28), box(1280, 510), box(1280, 422)],
    target: { x: 1280, y: 344 }, fish: [{ x: 720, y: 310 }, { x: 1040, y: 465 }, { x: 1435, y: 588 }] },
  { name: 'Ещё пять минуточек', subtitle: 'Последний сон гавани', hint: 'Финальный выстрел? Сделай его красивым.', shots: 3, wind: 0,
    blocks: [box(1060, 684, 54, 120, 'teal'), box(1210, 684, 54, 120, 'glass'), box(1360, 684, 54, 120, 'teal'), box(1210, 610, 370, 28), box(1110, 552), box(1310, 552), box(1210, 494, 310, 28, 'teal'), box(1210, 436, 88, 88, 'glass'), box(1210, 348)],
    target: { x: 1210, y: 269 }, fish: [{ x: 755, y: 265 }, { x: 1210, y: 548 }, { x: 1440, y: 412 }] },
];
export const WORLD = { width: 1600, height: 900, floor: 744, cannon: { x: 232, y: 658 } };
