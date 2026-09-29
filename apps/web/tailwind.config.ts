import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1f4e79',
          light: '#2f6ba0',
        },
      },
    },
  },
  plugins: [],
};
export default config;
