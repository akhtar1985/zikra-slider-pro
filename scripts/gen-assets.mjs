/**
 * Generates the demo's offline SVG artwork. Run: node scripts/gen-assets.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'examples/assets');
mkdirSync(dir, { recursive: true });

const palettes = [
  ['#0f172a', '#4338ca', '#22d3ee', '01'],
  ['#1c1917', '#b45309', '#fbbf24', '02'],
  ['#111827', '#be123c', '#fb7185', '03'],
  ['#052e16', '#15803d', '#a3e635', '04'],
  ['#1e1b4b', '#6d28d9', '#c4b5fd', '05'],
  ['#0c4a6e', '#0369a1', '#7dd3fc', '06'],
  ['#3b0764', '#9333ea', '#f0abfc', '07'],
  ['#431407', '#c2410c', '#fdba74', '08']
];

const svg = ([bg, mid, accent, num]) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="r" cx="0.78" cy="0.22" r="0.75">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0H0V64" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="1600" height="1000" fill="url(#g)"/>
  <rect width="1600" height="1000" fill="url(#grid)"/>
  <rect width="1600" height="1000" fill="url(#r)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.28">
    <circle cx="1240" cy="260" r="210"/>
    <circle cx="1240" cy="260" r="150"/>
    <circle cx="1240" cy="260" r="92"/>
    <path d="M-80 840 C 320 620, 620 980, 1040 720 S 1500 560, 1700 660" stroke-width="2"/>
    <path d="M-80 900 C 320 700, 620 1040, 1040 790 S 1500 640, 1700 730" stroke-width="1"/>
  </g>
  <g fill="#ffffff" fill-opacity="0.08">
    <rect x="120" y="120" width="220" height="220" rx="36"/>
    <rect x="380" y="120" width="90" height="220" rx="36"/>
  </g>
  <text x="118" y="800" fill="#ffffff" fill-opacity="0.16" font-family="ui-sans-serif, system-ui, sans-serif" font-size="230" font-weight="800" letter-spacing="-10">${num}</text>
  <text x="128" y="900" fill="#ffffff" fill-opacity="0.72" font-family="ui-sans-serif, system-ui, sans-serif" font-size="30" letter-spacing="10">ZIKRA / MOTION</text>
</svg>`;

palettes.forEach((palette, i) => {
  writeFileSync(resolve(dir, `art-${i + 1}.svg`), svg(palette));
});

console.log(`Wrote ${palettes.length} SVGs to examples/assets`);
