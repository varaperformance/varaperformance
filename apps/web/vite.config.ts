import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import viteCompression from "vite-plugin-compression";
import viteImagemin from "vite-plugin-imagemin";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
const bundleAnalyze = process.env.ANALYZE === "1" || process.env.ANALYZE === "true";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET ?? env.VITE_API_ORIGIN ?? "http://localhost:3000";
  const allowedHosts = (
    env.VITE_ALLOWED_HOSTS ??
    "varaperformance.com,.varaperformance.com,localhost"
  )
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (bundleAnalyze) {
    plugins.push(
      visualizer({
        filename: "stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }) as unknown as PluginOption
    );
  }

  // Pre-compress built assets: nginx uses gzip_static; .br is available for any layer with brotli
  plugins.push(
    viteCompression({ algorithm: "gzip" }),
    viteCompression({ algorithm: "brotliCompress" })
  );

  // Image optimization - convert to WebP and compress
  plugins.push(
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9] },
      svgo: {
        plugins: [
          {
            name: "removeViewBox",
            active: false,
          },
          {
            name: "removeEmptyAttrs",
            active: false,
          },
        ],
      },
    })
  );

  // PWA with service worker for caching
  plugins.push(
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Vara Performance',
        short_name: 'Vara',
        description: 'Track your fitness journey with Vara Performance',
        theme_color: '#0B1020',
        background_color: '#0B1020',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            // Only cache same-origin images (uploads via our own CDN/MinIO).
            // External images (TheMealDB, Unsplash, ExerciseDB) are opaque
            // responses that inflate Chrome's quota and surface as CORS errors.
            // Let the browser handle them natively without SW interception.
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/') && /\.(?:png|jpg|jpeg|svg|webp|gif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /\/v1\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    })
  );

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ["@varaperformance/core"],
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/, /@varaperformance\/core/],
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/scheduler/")
            ) {
              return "vendor-react";
            }
            if (id.includes("/node_modules/react-router/")) {
              return "vendor-router";
            }
            if (id.includes("/node_modules/@tanstack/react-query/")) {
              return "vendor-query";
            }
            if (id.includes("/node_modules/socket.io-client/")) {
              return "vendor-socket";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "vendor-charts";
            }
            if (id.includes("/node_modules/date-fns/")) {
              return "vendor-date";
            }
            if (id.includes("/node_modules/lucide-react/")) {
              return "vendor-icons";
            }
            if (
              id.includes("/node_modules/@tiptap/") ||
              id.includes("/node_modules/lowlight/") ||
              id.includes("/node_modules/highlight.js/")
            ) {
              return "vendor-editor";
            }
            if (id.includes("/node_modules/@dnd-kit/")) {
              return "vendor-dnd";
            }
            if (id.includes("/node_modules/@mapbox/")) {
              return "vendor-mapbox";
            }
            if (id.includes("/node_modules/react-syntax-highlighter/")) {
              return "vendor-syntax";
            }
            if (id.includes("/node_modules/react-modal-sheet/")) {
              return "vendor-sheet";
            }

            return;
          },
        },
      },
    },
    server: {
      allowedHosts,
      proxy: {
        "/v1": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/uploads": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      allowedHosts,
    },
  };
});
