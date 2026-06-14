import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    '!./app/**/*.test.{ts,tsx}',
    '!./app/**/*.spec.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '!./components/**/*.test.{ts,tsx}',
    '!./components/**/*.spec.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '!./lib/**/*.test.{ts,tsx}',
    '!./lib/**/*.spec.{ts,tsx}',
    '!./e2e/**',
    '!./playwright/**'
  ],
  theme: {
    extend: {
      borderRadius: {
        '4xl': '2rem'
      }
    }
  },
  plugins: []
}

export default config
