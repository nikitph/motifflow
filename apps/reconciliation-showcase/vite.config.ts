import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: process.env.GITHUB_ACTIONS ? "/motifflow/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    host: "0.0.0.0",
    port: 3500,
    hmr: false,
    proxy: {
      "/demo": { target: "http://127.0.0.1:3400", changeOrigin: false },
      "/approval": { target: "http://127.0.0.1:3400", changeOrigin: false },
    },
  },
});
