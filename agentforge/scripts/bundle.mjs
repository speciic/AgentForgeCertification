// Bundles the whole site into one self-contained file: dist/index.html
// (fonts, images, CSS, JS and data all inlined). Usage: node scripts/bundle.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p));
const mime = { '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const dataUri = (p) => `data:${mime[extname(p)]};base64,${read(p).toString('base64')}`;

let html = read('index.html').toString();

// CSS (+ fonts referenced as ../assets/...)
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const css = read(href).toString().replace(/url\(\.\.\/(assets\/[^)]+)\)/g, (m, a) => `url(${dataUri(a)})`);
  return `<style>\n${css}\n</style>`;
});

// JS — the certificate template path is inlined as a data URI too
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  let js = read(src).toString().replace(/'assets\/template\.jpg'/, `'${dataUri('assets/template.jpg')}'`);
  return `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`;
});

// Images
html = html.replace(/src="(assets\/[^"]+)"/g, (_, a) => `src="${dataUri(a)}"`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/index.html'), html);
console.log(`dist/index.html written (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
