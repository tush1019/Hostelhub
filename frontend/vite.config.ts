import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// "base: './'" makes the built files work when served by
// the Go Live Pro extension (static server on port 5500).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
