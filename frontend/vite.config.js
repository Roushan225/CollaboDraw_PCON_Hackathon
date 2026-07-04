import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          tldraw: ["tldraw", "@tldraw/editor", "@tldraw/store", "@tldraw/state"],
          react: ["react", "react-dom", "react-router-dom"]
        }
      }
    }
  }
});
