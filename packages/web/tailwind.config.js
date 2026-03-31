/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: { 900: '#0a0a0f', 800: '#111827', 700: '#1f2937', 600: '#374151', 500: '#4b5563' },
        accent: { DEFAULT: '#3b82f6', dark: '#2563eb', light: '#60a5fa' },
      },
    },
  },
  plugins: [],
};
