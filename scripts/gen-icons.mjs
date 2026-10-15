import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');

const GRADIENTS = {
  red: ['#ff9a9a', '#e5484d'],
  blue: ['#93b8ff', '#3b82f6'],
  green: ['#8ff0b5', '#22c55e'],
  amber: ['#ffd479', '#f59e0b'],
  violet: ['#d6aaff', '#a855f7'],
};

const ORBS = [
  { x: 178, y: 178, r: 46, c: 'red' },
  { x: 334, y: 178, r: 46, c: 'blue' },
  { x: 178, y: 334, r: 46, c: 'green' },
  { x: 334, y: 334, r: 46, c: 'amber' },
  { x: 256, y: 256, r: 62, c: 'violet' },
];

function iconSvg({ bleed = false } = {}) {
  const s = 512;
  const rx = bleed ? 0 : 96;
  const defs = Object.entries(GRADIENTS)
    .map(
      ([name, [hi, lo]]) =>
        `<radialGradient id="g-${name}" cx="35%" cy="30%" r="75%">` +
        `<stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></radialGradient>`,
    )
    .join('');
  const circles = ORBS.map(
    (o) =>
      `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="url(#g-${o.c})" ` +
      `stroke="rgba(0,0,0,.28)" stroke-width="2"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b2350"/><stop offset="1" stop-color="#0a0e20"/>
    </linearGradient>
    ${defs}
  </defs>
  <rect width="${s}" height="${s}" rx="${rx}" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="152" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="12"/>
  ${circles}
</svg>`;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(root, 'public', 'favicon.svg'), iconSvg());

  const jobs = [
    ['pwa-192x192.png', 192, false],
    ['pwa-512x512.png', 512, false],
    ['maskable-512x512.png', 512, true],
    ['apple-touch-icon-180x180.png', 180, false],
  ];

  for (const [name, size, bleed] of jobs) {
    await sharp(Buffer.from(iconSvg({ bleed })), { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, name));
  }

  console.log(`Wrote favicon.svg and ${jobs.length} icons to public/icons`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
