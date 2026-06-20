import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'

const siteConfig = JSON.parse(
  fs.readFileSync(new URL('../config/site.json', import.meta.url), 'utf-8')
) as Record<string, string>

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'site-config-html',
      transformIndexHtml(html) {
        return html
          .replace(/__SITE_TITLE__/g, escapeHtml(siteConfig.siteTitle))
          .replace(/__SITE_DESCRIPTION__/g, escapeHtml(siteConfig.siteDescription))
          .replace(/__SITE_FAVICON__/g, escapeHtml(siteConfig.faviconUrl))
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@site-config': path.resolve(__dirname, '../config/site.json'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
