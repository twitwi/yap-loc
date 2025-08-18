import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

function includesAny(v:string, ...choices:string[]): boolean {
  return choices.some(c => v.includes(c))
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  console.log('Starting app: ', env.VITE_APP_TITLE)
  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks: function (id) {
            if (id.includes('node_module') && includesAny(id, 'naive-ui', 'pinia', 'vue', 'leaflet', 'gpxparser', 'sprintf', 'colorjs')) {
              return 'base'
            }
          },
        },
      },
    },
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        workbox: {
          cleanupOutdatedCaches: true,
        },
        pwaAssets: {
          disabled: false,
          config: true,
        },
        manifest: {
          name: env.VITE_PWA_NAME,
          short_name: env.VITE_PWA_SHORT_NAME,
          description: env.VITE_PWA_DESCRIPTION,
          theme_color: env.VITE_THEME_HEXCOLOR,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
