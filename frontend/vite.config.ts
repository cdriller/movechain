import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import "./vite.git-env";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
