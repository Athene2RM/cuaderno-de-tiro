// Genera los iconos PNG de la PWA a partir de public/icon.svg y de su variante
// a sangre public/icon-maskable.svg (Android recorta esta con su propia forma).
// Uso: node scripts/icons.mjs  (necesita Playwright con Chromium)
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const read = (name) => readFileSync(new URL(`../public/${name}.svg`, import.meta.url), 'utf8');
const browser = await chromium.launch();
for (const [svg, size, name] of [
  [read('icon'), 192, 'icon-192'],
  [read('icon'), 512, 'icon-512'],
  [read('icon-maskable'), 512, 'icon-maskable-512'],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: new URL(`../public/${name}.png`, import.meta.url).pathname, omitBackground: true });
  await page.close();
}
await browser.close();
