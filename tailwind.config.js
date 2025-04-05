/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
        'source-han-sans': ['"Source Han Sans"', '"Source Han Sans SC"', '"Source Han Sans CN"', 'sans-serif']
      },
      fontSize: {
        'xs': '0.75rem',     // 12px
        'sm': '0.875rem',    // 14px
        'base': '1rem',      // 16px
        'lg': '1.125rem',    // 18px
        'xl': '1.25rem',     // 20px
        '2xl': '1.5rem',     // 24px
        '3xl': '1.875rem',   // 30px
        '4xl': '2.25rem',    // 36px
        '5xl': '3rem',       // 48px
        '6xl': '3.75rem',    // 60px
        '7xl': '4.5rem',     // 72px
        '8xl': '6rem',       // 96px
        '9xl': '8rem'        // 128px
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            code: {
              color: '#ef476f',
              backgroundColor: '#f8f9fa',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400'
            }
          }
        },
        dark: {
          css: {
            color: '#fff',
            code: {
              color: '#ef476f',
              backgroundColor: '#374151'
            }
          }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}