# NovaTech Games Hub 🎮

NovaTech Games Hub is an interactive web experience for NovaTech exhibitions. Visitors can launch four games from a responsive, kiosk-friendly home screen. The same frontend can also be packaged as a Tauri desktop app.

## Games

- **Flappy Drone** — guide the drone through obstacles.
- **Connect Four** — local two-player strategy game.
- **Memory Match** — match NovaTech product images across three difficulty levels.
- **NovaTech Catcher** — catch falling items and avoid obstacles.

Game settings and best scores are saved in the browser's local storage.

## Technology

- React 19 and TypeScript 5.9
- Vite 6 and React Router 7
- Tailwind CSS 4 and Lucide React
- `vite-plugin-pwa` for the web app
- Tauri 2 for the optional desktop app

## Project structure

Source files are at the repository root; this project does not use a `src/` directory.

```text
.
├── App.tsx                 # Hash-based app routes
├── index.tsx               # React entry point
├── types.ts                # Shared types and route definitions
├── components/             # Shared UI components
├── games/                  # Game implementations
├── utils/                  # Shared utilities and game settings
├── views/                  # Page views, including the game launcher
├── public/assets/          # Logos, game images, and static assets
├── src-tauri/              # Tauri desktop application
├── index.css               # Global styles and Tailwind entry point
├── vite.config.ts          # Web, PWA, and Tauri build configuration
└── package.json            # Dependencies and npm scripts
```

## Get started

### Requirements

- Node.js 18 or newer and npm
- For desktop builds: Rust and the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/)

### Install and run the web app

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Vite is configured to use port 3000.

### Verify and build

```bash
npx tsc --noEmit
npm run build
npm run preview
```

The production web bundle is written to `dist/`. There are currently no automated test or lint scripts in `package.json`.

### Run or build the desktop app

```bash
npm run dev:desktop
npm run build:desktop
```

`npm run build:tauri` builds the frontend with Tauri-specific asset paths. `npm run build:desktop` builds that frontend and packages it with Tauri; installers are produced under `src-tauri/target/release/bundle/`.

## Deployment and PWA

The web build is configured for GitHub Pages at `/expogame-hub/` and uses hash-based routing for page navigation. To deploy, `npm run deploy` builds the site and publishes `dist/` to the `gh-pages` branch. This command performs a deployment; do not use it as a local build check.

The web build includes a Progressive Web App service worker and manifest. PWA generation is disabled for the Tauri build.

Live demo: [pomareda-dev.github.io/expogame-hub](https://pomareda-dev.github.io/expogame-hub/)

## License and author

This project is part of NovaTech's exhibition materials.

**Author:** Alexander Pomareda — [GitHub](https://github.com/pomareda-dev)

---

Designed for NovaTech with ❤️ by Alexander Pomareda
