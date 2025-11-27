# NovaTech Games Hub 🎮

Interactive games hub designed to accompany NovaTech exhibitions. This web application provides an engaging collection of games that showcase cutting-edge technology and interactive experiences.

## 🎯 Project Objective

The ExpoGame Hub serves as an interactive entertainment platform for NovaTech exhibitions, offering visitors a hands-on gaming experience that complements the technological innovations on display. The hub features multiple games designed to be accessible, engaging, and responsive across all devices.

## 🎮 Available Games

- **Flappy Drone** - Navigate a drone through obstacles with responsive controls
- **Connect Four** - Classic strategy game with AI opponent
- **Memory Game** - Test your memory with multiple difficulty levels
- **Star Catcher** - Catch falling items while avoiding obstacles

## 🛠️ Technologies

### Core Stack

- **React 19.2.0** - UI library for building interactive components
- **TypeScript 5.8.2** - Type-safe JavaScript
- **Vite 6.2.0** - Fast build tool and dev server
- **React Router DOM 7.9.6** - Client-side routing

### Styling & UI

- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Lucide React 0.554.0** - Icon library
- **Google Fonts (Inter)** - Typography

### Build & Deployment

- **gh-pages 6.3.0** - GitHub Pages deployment
- **vite-plugin-pwa 1.1.0** - Progressive Web App support

## 📁 Project Structure

```
expogame-hub/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── GameLayout.tsx
│   └── ResultModal.tsx
├── games/              # Game implementations
│   ├── CatcherGame.tsx
│   ├── ConnectFour.tsx
│   ├── FlappyBird.tsx
│   └── MemoryGame.tsx
├── views/              # Page views
│   └── Home.tsx
├── public/             # Static assets
│   └── assets/         # Images and icons
├── App.tsx             # Main app component with routing
├── index.tsx           # Application entry point
├── index.css           # Global styles
├── types.ts            # TypeScript type definitions
└── vite.config.ts      # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/pomareda-dev/expogame-hub.git
   cd expogame-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## 💻 Development

Run the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Development Features

- ⚡ Hot Module Replacement (HMR)
- 🔍 TypeScript type checking
- 🎨 Tailwind CSS with JIT compilation
- 📱 Responsive design testing

## 🏗️ Build & Deployment

### Build for Production

Create an optimized production build:

```bash
npm run build
```

This generates a `dist/` directory with optimized static files ready for deployment.

### Preview Production Build

Test the production build locally:

```bash
npm run preview
```

### Deploy to GitHub Pages

Deploy the application to GitHub Pages:

```bash
npm run deploy
```

This command:

1. Runs `npm run build` to create the production bundle
2. Deploys the `dist/` folder to the `gh-pages` branch
3. Makes the app available at: `https://pomareda-dev.github.io/expogame-hub/`

**Note:** Ensure the `homepage` field in `package.json` matches your GitHub Pages URL.

## 🌐 Live Demo

Visit the live application: [https://pomareda-dev.github.io/expogame-hub/](https://pomareda-dev.github.io/expogame-hub/)

## 📱 Progressive Web App (PWA)

This application is configured as a PWA, allowing users to:

- Install the app on their devices
- Use it offline (with service worker caching)
- Enjoy a native app-like experience

## 🎨 Features

- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Touch Support** - Full touch and gesture support for mobile gaming
- **High Scores** - Local storage persistence for game scores
- **Smooth Animations** - Canvas-based rendering for optimal performance
- **SEO Optimized** - Meta tags for social media sharing

## 📄 License

This project is part of NovaTech's exhibition materials.

## 👤 Author

Alexander Pomareda - [GitHub](https://github.com/pomareda-dev)

---

Designed for NovaTech with ❤️ by Alexander Pomareda
