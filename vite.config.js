import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'design-reference/*.png'],
            manifest: {
                name: 'MYM Life System',
                short_name: 'MYM',
                description: '完全本地、离线优先的个人生活系统',
                theme_color: '#f8faf7',
                background_color: '#f8faf7',
                display: 'standalone',
                start_url: '/',
                orientation: 'portrait-primary',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
                cleanupOutdatedCaches: true,
                navigateFallback: '/index.html'
            }
        })
    ]
});
