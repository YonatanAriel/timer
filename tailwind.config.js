/******************************************************************************
 Tailwind Config - minimal, no extras
 ******************************************************************************/
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#0B1220',
        card: '#121A2B',
        accent: '#7CC4FF',
        calm: '#A3E3FF',
      },
      boxShadow: {
        card: '0 10px 30px rgba(0,0,0,0.35)'
      }
    },
  },
  plugins: [],
};
