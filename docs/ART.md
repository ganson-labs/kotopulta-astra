# Графика и звук

Задумка и расположение игровых объектов сохранены из `C:\ai-tests\napkin\napkin.jpg`: кот и пушка слева, дуга выстрела, рыбки, коробки и сонный кот справа. Исходная фотография не изменялась.

Фон: `public/art/harbor.png`. Создан встроенным инструментом **Imagegen**, не CLI, затем скопирован в проект. Размер 1672 × 941. В релизе используется локальная копия `dist/art/harbor.png`.

Точный prompt:

> Use case: illustration-story. Asset type: high quality 2D game background, landscape 16:9, 1920x1080. Create an exquisite hand-painted storybook background for a cozy cat catapult physics game in a little Mediterranean fishing harbor at golden hour. Side-on platform game view. Soft gouache, sophisticated muted peach and butter-yellow sunset sky, luminous cream sun near center, distant layered desaturated sage and teal coastal cliffs, tiny pastel fishing village far away on the left and right edges, calm blue-green harbor water in lower third, delicate painterly clouds. Beautiful rich textured illustration with atmospheric perspective, warm cinematic light, playful indie game art direction. Main gameplay occupies entire middle foreground, so leave central 80 percent of image quiet, low contrast, mostly sky above and water below. Horizon at 63 percent image height. No foreground platform, no ground strip, no gameplay objects, no crates, no cats, no cannon, no text, no letters, no logo, no interface. Distant ships and village detail only very small at edges. A fully painted finished environment, not a sketch. Wide panorama, color harmony, clean silhouettes.

Коты, пушка, ящики, рыбки, причал, флажки и частицы — оригинальная программная Canvas-графика в `src/render/art.ts`, заранее превращаемая в текстуры двойного разрешения. Игровые объекты отделены от фона. Интерфейс и эмблема — HTML/CSS/SVG.

Музыка и эффекты — оригинальный Web Audio синтез в `src/audio/sound.ts`; сторонних аудиозаписей нет. Фоновый рисунок — инструментальная последовательность в темпе 88 BPM, с мягким басом и щипковыми нотами. Эффекты включают выстрел, рывок, мурчащее мяу, дерево, стекло, сбор рыбки и мелодию победы.

Шрифты Nunito и Unbounded поставляются локально через Fontsource; тексты лицензий OFL находятся в соответствующих npm-пакетах. Код Phaser и Matter.js распространяется под MIT.
