import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vite config for the Hermes Steam Deck front end.
// The dev server binds to all interfaces so it can be reached from a Deck on the LAN.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
