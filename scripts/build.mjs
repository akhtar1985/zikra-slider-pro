/**
 * Zero-dependency build for Zikra Slider Pro.
 * Emits UMD (browser + AMD + CommonJS), CJS, ESM and minified variants,
 * plus the TypeScript declarations, from the ESM source.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const source = readFileSync(resolve(root, 'src/zikraslider.js'), 'utf8');

const body = source
  .split('\n')
  .filter((line) => !/^export\s/.test(line.trim()))
  .join('\n')
  .trim();

if (/\bexport\s+(default|\{)/.test(body)) {
  throw new Error('Build aborted: unhandled export statement left in the bundle body.');
}

const banner = `/*! Zikra Slider Pro v${pkg.version} | MIT | zero dependencies */`;
const umd = `${banner}
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.zikraslider = factory();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

${body}

  return zikraslider;
});
`;

const cjs = `${banner}
'use strict';

${body}

module.exports = zikraslider;
`;

const esm = source.endsWith('\n') ? source : `${source}\n`;

const minify = (code) => `${banner}
${transformSync(code, {
  loader: 'js',
  minify: true,
  legalComments: 'none',
  target: 'es2020'
}).code}`;

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/zikraslider.umd.js'), umd);
writeFileSync(resolve(root, 'dist/zikraslider.min.js'), minify(umd));
writeFileSync(resolve(root, 'dist/zikraslider.cjs'), cjs);
writeFileSync(resolve(root, 'dist/zikraslider.esm.js'), esm);
writeFileSync(resolve(root, 'dist/zikraslider.esm.min.js'), minify(esm));
copyFileSync(resolve(root, 'src/zikraslider.d.ts'), resolve(root, 'dist/zikraslider.d.ts'));
copyFileSync(resolve(root, 'src/zikra-slider.css'), resolve(root, 'dist/zikra-slider.css'));

const kb = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} kB`;
console.log(`Built Zikra Slider Pro v${pkg.version}`);
console.log(`  dist/zikraslider.umd.js      ${kb(umd)}`);
console.log(`  dist/zikraslider.min.js      ${kb(minify(umd))}`);
console.log(`  dist/zikraslider.cjs         ${kb(cjs)}`);
console.log(`  dist/zikraslider.esm.js      ${kb(esm)}`);
console.log(`  dist/zikraslider.esm.min.js  ${kb(minify(esm))}`);
console.log('  dist/zikraslider.d.ts        copied');
console.log('  dist/zikra-slider.css        copied');
