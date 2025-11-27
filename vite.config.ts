import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['assets/favicon.ico', 'assets/apple-touch-icon.png', 'assets/masked-icon.svg'],
          manifest: {
            name: 'NovaTech Games Hub',
            short_name: 'NovaGames',
            description: 'Interactive Experience Center for NovaTech',
            theme_color: '#0f172a',
            background_color: '#0f172a',
            display: 'standalone',
            icons: [
              {
                src: 'assets/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'assets/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'assets/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
          }
        })
      ],
      base: './',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
