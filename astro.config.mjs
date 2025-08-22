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
  site: "https://ai-news.helloworldfirm.com"
});
