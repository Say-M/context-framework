import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Docker Desktop's bind mounts (Windows/WSL2) don't propagate native fs
    // events into the container, so chokidar's default watcher never fires —
    // fall back to polling there. Left off for native local dev, where
    // native events work fine and polling would just burn CPU.
    watch: process.env.VITE_WATCH_POLLING ? { usePolling: true } : undefined,
  },
});
