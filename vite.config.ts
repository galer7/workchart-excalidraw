import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "process.env.IS_PREACT": JSON.stringify("true"),
  },
  // if in github ci, set base to /workchart/
  base: process.env.GITHUB_ACTIONS ? "/workchart/" : "/",
});
