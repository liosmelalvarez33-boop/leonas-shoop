import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import config from './src/data/config.json' with { type: 'json' };

export default defineConfig({
  site: config.site,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
