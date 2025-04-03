/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',

    // 如果你用了 monorepo 或 electron-vite 结构，可能还需要：
    './packages/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {}
  },
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
