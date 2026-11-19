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
npm test
npm run test:e2e
npm run build
```

`npm test` runs the deterministic Circuit Express, Production Line and Connect Four engine suites with Node's built-in test runner. `npm run test:e2e` runs the Playwright end-to-end suite in `e2e/` and starts the dev server itself; `npm run test:e2e:ui` opens the interactive runner and `npm run test:e2e:report` serves the last HTML report. No lint script is configured; do not report a lint suite as passing.

End-to-end specs live in `e2e/` and depend on two project facts: the dev server serves the app from the Vite base path `/expogame-hub/`, and routing is hash-based. Navigate with relative URLs (`page.goto('./#/connect-four')`): a leading slash resolves against the origin and silently drops the base path from `baseURL`. A game screen renders its title as a level-1 heading, and that heading repeats the launcher label exactly (`NovaTech Catcher` both on the launcher and in the header); `e2e/home.spec.ts` asserts that for every game. Playwright is configured for `chromium` and `mobile-chrome` (emulated Pixel 5); keep both projects touching when changing game input or global styles.

The Playwright MCP server is registered for this repository in `.pi/mcp.json`. It is an authoring aid for driving a real browser by hand, not a test runner: the suite in `e2e/` stays the source of truth.

For desktop development/builds, install the Rust toolchain and the platform-specific Tauri prerequisites first:

```bash
npm run dev:desktop
npm run build:desktop
```

`npm run build:tauri` builds the frontend with the Tauri Vite mode; `npm run build:desktop` also invokes the Tauri bundler. `npm run deploy` publishes the web build to the `gh-pages` branch, so do not run it as a local verification step.

## Documentation and generated files

Keep this guidance and `README.md` consistent with `package.json`, `vite.config.ts`, and the actual source tree. Do not describe commands, routes, game modes, or assets that are not present in the repository. Build output belongs in `dist/`; do not hand-edit generated output.
