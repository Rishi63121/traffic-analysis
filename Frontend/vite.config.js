// frontend/vite.config.js
// Vite is the tool that runs and builds our React app.
// The proxy below means any fetch to "/api/..." in React
// automatically gets forwarded to Flask on port 5000.
// So instead of writing "http://localhost:5000/predict"
// everywhere, we just write "/api/predict". Much cleaner.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",    // Flask runs here
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),  // strip /api prefix
      },
    },
  },
});