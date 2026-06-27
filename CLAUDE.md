# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

- `project/` — original HTML/CSS/JS design prototypes from a Claude Design handoff (see `README.md`). Treat as reference, not source of truth.
- `app/` — the actual implementation. **All work happens here.** `cd app` before running commands.

## Commands (run from `app/`)

- `npm run dev` — vite dev server (web only, no Capacitor)
- `npm run build` — vite build into `dist/`
- `npm run lint` — oxlint
- `npm run city <cityId>` — write per-city config + build (no iOS sync). Valid cityIds: filenames in `app/public/cities/` minus `.json`.
- `npm run ios:<city>` — full per-city build → `cap sync ios` → opens Xcode (e.g. `npm run ios:kfarsaba`)
- `npm run ios:init` — first-time `cap add ios` (only run once per fresh checkout)

No tests exist in the repo.

## Architecture

**Single-tenant build, multi-tenant repo.** Each Israeli municipality ships as its own iOS app with its own bundle ID, generated from one shared React codebase. There is no in-app city switcher — the city is baked in at build time.

The flow when you run `npm run ios:<city>`:

1. `scripts/build-city.mjs` reads `public/cities/<city>.json` (the city manifest).
2. It writes `public/config.json` (`{ city, lang }`) and `capacitor.config.json` (bundle id, app name, theme colors) from that manifest.
3. `vite build` emits `dist/`.
4. The script patches `ios/App/App.xcodeproj/project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER`) and `Info.plist` (`CFBundleDisplayName`) — `cap sync` doesn't touch these.
5. If the manifest has `app.logoUrl`, it fetches the logo, generates a 1024×1024 icon and 2732×2732 splash into `cities-assets/<city>/` (cached — only regenerated if missing), copies them to `assets/`, and runs `npx capacitor-assets generate --ios` to emit all required iOS sizes.
6. `npx cap sync ios` copies `dist/` to `ios/App/App/public/` and opens Xcode.

**Runtime side** (`src/App.jsx`, one ~550-line class component): on mount fetches `./config.json` → fetches `./cities/<city>.json` → renders the entire UI from that config (header colors, buttons grid, side menu, notifications, in-app browser/safari/appstore mock pages, action sheets for phone/whatsapp/app). All UI strings live in the manifest under `{ he, en }` pairs; `this.L(obj)` picks based on `state.lang`. Styling is inline; only `index.css` has globals (body bg = `theme.primaryDark`, keyframes, scrollbar).

**Adding a city:** drop a new `public/cities/<id>.json` matching the schema of `kfarsaba.json` (name, sub, app.bundleId, app.displayName, app.logoUrl, theme, buttons, menu, notifs), add an `ios:<id>` script to `package.json` if you want a shortcut, then `npm run ios:<id>`.

## Gotchas

- `vite.config.js` has `base: './'` and a `strip-crossorigin` plugin — both required for Capacitor's `file://`-style asset loading. Don't change either without understanding why.
- `capacitor.config.json` is **generated** by `build-city.mjs`. Edits get overwritten — change the source in the city manifest or in the script's template literal.
- Capacitor 8 + Vite 8 are current at time of writing; both are recent majors.
- All JSON manifest text is bilingual `{ he, en }`. The default language ships from `config.json` (currently `he`); RTL is implicit in the layout via `this.isHE` flips.
