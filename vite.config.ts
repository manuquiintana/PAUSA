/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

// En el build de demo, empaquetamos el sistema de archivos de PGlite (pglite.data) comprimido
// dentro de un módulo JS: algunos hostings no sirven ficheros .data. La app lo carga y descomprime.
function pgliteFsBundle(): Plugin {
  return {
    name: 'pglite-fs-bundle',
    apply: 'build',
    generateBundle() {
      const req = createRequire(import.meta.url)
      const dir = dirname(req.resolve('@electric-sql/pglite'))
      const gz = gzipSync(readFileSync(join(dir, 'pglite.data')), { level: 9 }).toString('base64')
      this.emitFile({ type: 'asset', fileName: 'assets/pglite-fs.js', source: `export default ${JSON.stringify(gz)}\n` })
    },
  }
}

export default defineConfig(({ mode }) => ({
  // Rutas relativas: permite servir el build desde cualquier carpeta (p. ej. la vista previa)
  base: './',
  plugins: [
    react(),
    mode === 'demo' && pgliteFsBundle(),
    VitePWA({
      // En modo demo no registramos service worker (la vista previa no lo necesita)
      disable: mode === 'demo',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Pausa',
        short_name: 'Pausa',
        description: 'Tu bienestar también forma parte de tu jornada laboral.',
        lang: 'es-ES',
        theme_color: '#6F9A82',
        background_color: '#F7F4EE',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'] },
    }),
  ],
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  test: { include: ['src/**/*.test.ts'] },
}))
