#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const city = process.argv[2];
if (!city) { console.error('usage: build-sprite <cityId>'); process.exit(1); }

const symbols = new Map(); // id -> markup. City dir overrides general.
for (const dir of [`icons/general`, `icons/${city}`]) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.svg'))) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1] || '0 0 24 24';
    const inner = raw.replace(/<\?xml[\s\S]*?\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
    symbols.set(f.replace(/\.svg$/, ''), `<symbol id="${f.replace(/\.svg$/, '')}" viewBox="${viewBox}">${inner}</symbol>`);
  }
}

writeFileSync('public/sprite.svg', `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${[...symbols.values()].join('')}</svg>`);
console.log(`→ sprite: ${symbols.size} icon(s) for ${city}`);
