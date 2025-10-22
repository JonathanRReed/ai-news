import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [
    tailwind(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]]
      }
    })
  ],
  output: "static",
  site: "https://ai-news.helloworldfirm.com",
  build: {
    inlineStylesheets: "auto",
    assets: "_astro"
  },
  vite: {
    build: {
      cssCodeSplit: true,
      minify: "esbuild",
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("@tanstack")) {
                return "vendor-react";
              }
              return "vendor";
            }
          }
        }
      }
    },
    ssr: {
      noExternal: ["@tanstack/react-query"]
    }
  }
});
