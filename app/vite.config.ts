import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

function vendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return;

  if (id.includes("@xyflow")) return "xyflow";
  if (
    id.includes("react-markdown") ||
    id.includes("remark-") ||
    id.includes("micromark") ||
    id.includes("mdast-") ||
    id.includes("unist-")
  ) {
    return "markdown";
  }
  if (id.includes("lucide-react")) return "lucide";
  if (id.includes("react-dom") || id.includes("/react/")) return "react-vendor";
}

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
