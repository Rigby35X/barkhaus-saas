import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";

export default defineConfig({
  site: "https://site-0-5ayxjbg5q-rigby35xs-projects.vercel.app",
  output: "server", // Enable server-side rendering
  integrations: [
    icon(),
    sitemap({
      filter: (page) => !page.includes("/admin"),
      changefreq: "weekly",
      priority: 0.7,
    }),
  ],
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
});
