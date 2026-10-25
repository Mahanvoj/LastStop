const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fontDir = path.join(root, 'src', 'fonts');

const fonts = [
  ['Barlow Condensed', 600, 'barlow-600.woff2'],
  ['Barlow Condensed', 700, 'barlow-700.woff2'],
  ['Rajdhani', 500, 'rajdhani-500.woff2'],
  ['Rajdhani', 600, 'rajdhani-600.woff2'],
  ['Rajdhani', 700, 'rajdhani-700.woff2'],
];

const fontCss = fonts.map(([family, weight, file]) => {
  const data = fs.readFileSync(path.join(fontDir, file)).toString('base64');
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${data}) format('woff2');}`;
}).join('\n');

let shell = read('src/shell.html');
const styles = read('src/styles.css');
const three = read('three.min.js');
const gameDir = path.join(root, 'src', 'game');
const game = fs.readdirSync(gameDir)
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => fs.readFileSync(path.join(gameDir, file), 'utf8'))
  .join('\n\n');
const wrappedGame = `(function () {\n'use strict';\n${game}\n})();`;

function inject(html, token, content) {
  if (!html.includes(token)) throw new Error(`Missing token ${token}`);
  return html.split(token).join(content);
}

shell = inject(shell, '{{FONTS}}', fontCss);
shell = inject(shell, '{{STYLES}}', styles);
shell = inject(shell, '{{THREE}}', three);
shell = inject(shell, '{{GAME}}', wrappedGame);

fs.writeFileSync(path.join(root, 'index.html'), shell, 'utf8');
const bytes = Buffer.byteLength(shell, 'utf8');
console.log(`Built index.html — ${(bytes / 1024 / 1024).toFixed(2)} MB`);
