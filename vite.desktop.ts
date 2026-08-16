import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  root: ".",
  base: "./",
  publicDir: "public",
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    tsconfigPaths: true,
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    outDir: "desktop-web",
    emptyOutDir: true,
    rollupOptions: { input: resolve(__dirname, "desktop/index.html") },
  },
});
