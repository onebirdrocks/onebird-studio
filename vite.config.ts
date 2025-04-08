import { defineConfig } from 'vite'
import electron from 'vite-electron-plugin'
import { customStart } from 'vite-electron-plugin/plugin'
import renderer from 'vite-plugin-electron-renderer'
import { rmSync } from 'node:fs'
import { notBundle } from 'vite-plugin-electron/plugin'
import pkg from './package.json'

rmSync('dist-electron', { recursive: true, force: true })

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    electron({
      include: ['electron'],
      transformOptions: {
        sourcemap: !!process.env.VSCODE_DEBUG,
      },
      plugins: [
        customStart(debounce(() => console.log('[startup] Electron App'))),
        notBundle(),
      ],
    }),
    renderer({
      nodeIntegration: true,
      optimizeDeps: {
        include: [
          '@modelcontextprotocol/sdk',
          'which',
          'cross-spawn'
        ]
      }
    }),
  ],
  optimizeDeps: {
    exclude: ['@modelcontextprotocol/sdk']
  },
  build: {
    rollupOptions: {
      external: ['@modelcontextprotocol/sdk']
    }
  },
  resolve: {
    alias: {
      '@modelcontextprotocol/sdk': '@modelcontextprotocol/sdk/dist/esm'
    }
  },
  define: {
    'process.env': process.env
  }
})

function debounce<Fn extends (...args: any[]) => void>(fn: Fn, delay = 299): Fn {
  let t: NodeJS.Timeout
  return ((...args: Parameters<Fn>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }) as Fn
} 