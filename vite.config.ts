import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

import { nodePolyfills } from "vite-plugin-node-polyfills";
import { config } from "dotenv";
config();
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "process.env": process.env,
  },
  server: {
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 5173,
  },
});
