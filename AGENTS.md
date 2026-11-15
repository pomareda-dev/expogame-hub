# Repository Guidance

## Project shape

This is a React + TypeScript + Vite application. Application code lives at the repository root; there is no `src/` directory. Keep these responsibilities aligned when changing behavior:

- `App.tsx` and `types.ts`: hash-based routes and the `GameRoute` definitions.
- `views/Home.tsx`: game launcher and the display metadata for each game.
- `games/`: individual game implementations.
- `components/`: shared UI and game layout.
- `utils/gameSettings.ts` and `components/SettingsModal.tsx`: persisted game settings and their controls.
- `public/assets/`: static images, logos, and PWA icons.
- `src-tauri/`: Tauri desktop wrapper and native configuration.

Use the existing `@/` import alias for paths from the repository root where appropriate. Match the existing TypeScript and React component style in nearby files.

## Important behavior and configuration

- `HashRouter` is intentional: it supports direct navigation on the GitHub Pages deployment. Keep routes in `types.ts` synchronized with route declarations in `App.tsx` and launcher entries in `views/Home.tsx`.
- The web build uses `/expogame-hub/` as its Vite base path; the Tauri build uses `./`. When changing deployment or asset paths, check `vite.config.ts`, `package.json`, and Tauri configuration together. Reference public assets through the existing Vite base URL pattern.
- Styling uses Tailwind CSS 4 through `@tailwindcss/postcss`; `index.css` imports Tailwind with `@import "tailwindcss"` and declares the project tokens (brand colors and the `animate-bounce-slight` animation) inside an `@theme` block. There is no `tailwind.config.js`: Tailwind 4 auto-detects content sources, so add or change design tokens in that `@theme` block instead of reintroducing a JS config.
- Game settings and best scores are persisted in browser `localStorage`. Preserve existing keys and stored-data compatibility unless a change explicitly requires a migration. Check mobile touch behavior when changing game input or global styles.
- The PWA plugin is enabled for web builds and disabled in Tauri mode. Verify any icon or static-asset paths you change against files in `public/assets/`.

## Install, run, and verify

Use the lockfile-backed install for a clean environment:

```bash
npm ci
npm run dev
```

Vite serves the web app at `http://localhost:3000` by default.

Before handing off application changes, run the relevant checks:

```bash
npx tsc --noEmit
npm run build
```

There are currently no `test` or `lint` scripts in `package.json`. Do not report a test or lint suite as passing unless one has been added and run.

For desktop development/builds, install the Rust toolchain and the platform-specific Tauri prerequisites first:

```bash
npm run dev:desktop
npm run build:desktop
```

`npm run build:tauri` builds the frontend with the Tauri Vite mode; `npm run build:desktop` also invokes the Tauri bundler. `npm run deploy` publishes the web build to the `gh-pages` branch, so do not run it as a local verification step.

## Documentation and generated files

Keep this guidance and `README.md` consistent with `package.json`, `vite.config.ts`, and the actual source tree. Do not describe commands, routes, game modes, or assets that are not present in the repository. Build output belongs in `dist/`; do not hand-edit generated output.
