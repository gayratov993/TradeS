/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EFFDF5',
          100: '#D7F9E5',
          200: '#B3F1CC',
          300: '#7EE4AA',
          400: '#47D184',
          500: '#2ECC71',
          600: '#22A25A',
          700: '#1C8248',
          800: '#19673B',
          900: '#175433',
        },
        // POS / SAVDO dark theme (RAOS-inspired)
        pos: {
          bg:      '#0B1220',
          card:    '#111C2E',
          border:  '#1E293B',
          accent:  '#2ECC71',
          accentHover: '#26A85D',
          text:    '#FFFFFF',
          muted:   '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
