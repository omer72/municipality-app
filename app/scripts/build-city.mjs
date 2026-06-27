#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const city = args.find(a => !a.startsWith('-'));
if (!city) { console.error('usage: build-city <cityId> [--lang=he|en] [--sync]'); process.exit(1); }
const lang = (args.find(a => a.startsWith('--lang='))?.split('=')[1]) || 'he';
const doSync = args.includes('--sync');

const manifest = JSON.parse(readFileSync(`public/cities/${city}.json`, 'utf8'));
const { bundleId, displayName, logoUrl } = manifest.app;

writeFileSync('public/config.json', JSON.stringify({ city, lang }, null, 2) + '\n');
writeFileSync('capacitor.config.json', JSON.stringify({
  appId: bundleId, appName: displayName, webDir: 'dist',
  backgroundColor: manifest.theme.primaryDark,
  ios: { contentInset: 'never', backgroundColor: manifest.theme.primaryDark },
}, null, 2) + '\n');

console.log(`→ ${city}: ${bundleId} (${displayName})`);

// Generate cached icon + splash from city logo (must precede vite build so public/logo.png is in dist).
if (logoUrl) {
  const cacheDir = `cities-assets/${city}`;
  if (!existsSync(`${cacheDir}/icon.png`) || !existsSync(`${cacheDir}/splash.png`)) {
    const sharp = (await import('sharp')).default;
    mkdirSync(cacheDir, { recursive: true });
    const buf = Buffer.from(await (await fetch(logoUrl, { headers: { 'User-Agent': 'MunicipalApp/1.0' } })).arrayBuffer());
    const bg = manifest.theme.primary;
    const fit = { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } };
    const logoIcon = await sharp(buf).resize(820, 820, fit).toBuffer();
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } })
      .composite([{ input: logoIcon, gravity: 'center' }]).png().toFile(`${cacheDir}/icon.png`);
    const logoSplash = await sharp(buf).resize(1200, 1200, fit).toBuffer();
    await sharp({ create: { width: 2732, height: 2732, channels: 4, background: bg } })
      .composite([{ input: logoSplash, gravity: 'center' }]).png().toFile(`${cacheDir}/splash.png`);
    console.log(`✓ generated ${cacheDir}/icon.png + splash.png`);
  }
  mkdirSync('assets', { recursive: true });
  copyFileSync(`${cacheDir}/icon.png`, 'assets/icon-only.png');
  copyFileSync(`${cacheDir}/splash.png`, 'assets/splash.png');
  copyFileSync(`${cacheDir}/icon.png`, 'public/logo.png');
}

execSync(`node scripts/build-sprite.mjs ${city}`, { stdio: 'inherit' });
execSync('npm run build', { stdio: 'inherit' });

if (!doSync) process.exit(0);

// `cap sync` doesn't update the Xcode bundle id or Info.plist display name. Patch both.
const pbxproj = 'ios/App/App.xcodeproj/project.pbxproj';
const plist = 'ios/App/App/Info.plist';
if (existsSync(pbxproj)) {
  writeFileSync(pbxproj, readFileSync(pbxproj, 'utf8').replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};`));
}
if (existsSync(plist)) {
  writeFileSync(plist, readFileSync(plist, 'utf8').replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${displayName}$2`));
}

if (logoUrl) execSync('npx capacitor-assets generate --ios', { stdio: 'inherit' });
execSync('npx cap sync ios', { stdio: 'inherit' });
