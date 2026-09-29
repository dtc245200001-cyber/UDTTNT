/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B5A1E',
          hover: '#734814',
          dark: '#5E360C',
          light: '#F4EFEA',
        },
        museum: {
          brown: '#5B3A1F',
          'brown-dk': '#3E2712',
          gold: '#B8860B',
          'gold-lt': '#D9A441',
          cream: '#F5EFE0',
          ivory: '#FBF8F1',
          page: '#FBF7F0',
        },
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#D97706',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['"Playfair Display"', '"Be Vietnam Pro"', 'Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
}
