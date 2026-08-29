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
    port: 5174,
    // See apps/web/vite.config.ts — same Docker Desktop bind-mount caveat.
    watch: process.env.VITE_WATCH_POLLING ? { usePolling: true } : undefined,
  },
});
