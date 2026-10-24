import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const plugins = [react(), tailwindcss(), jsxLocPlugin()];
const githubPagesBase = process.env.GITHUB_PAGES === "true" ? "/borewatch/" : "/";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "");
  const neonAuthUrl = process.env.VITE_NEON_AUTH_URL || env.VITE_NEON_AUTH_URL || env.NEON_AUTH_BASE_URL;
  return {
  base: githubPagesBase,
  plugins,
  define: {
    "import.meta.env.VITE_NEON_AUTH_URL": JSON.stringify(neonAuthUrl),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  };
});
