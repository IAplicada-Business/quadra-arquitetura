import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Sprint 7d (call 23/06): "demonstrar PWA na próxima reunião —
    // instalação do aplicativo PWA". Service worker básico com
    // precache do shell, ícones e manifest da marca.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Quadra",
        short_name: "Quadra",
        description:
          "Plataforma de gestão de obras e operação da Quadra.",
        theme_color: "#1B2A4A",
        background_color: "#FAF7F2",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache shell. APIs Supabase nunca são cacheadas (sempre
        // network) para evitar mostrar dado velho.
        navigateFallback: "/",
        // O bundle principal está em ~3MB e há fotos grandes na landing
        // que não precisam ir pro precache. Limite generoso e ignoramos
        // os arquivos pesados de mídia.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globIgnores: ["**/founders-*.png", "**/socias-*.jpg"],
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
