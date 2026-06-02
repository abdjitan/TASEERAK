/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1B2D5B', dark: '#0f1d3d', light: '#2a4a8a' },
        orange: { DEFAULT: '#F5831F', dark: '#d96f15', light: '#f9a85c' },
        blue: {
          50: '#E6F1FB', 100: '#B5D4F4', 200: '#85B7EB',
          400: '#378ADD', 600: '#185FA5', 800: '#0C447C', 900: '#042C53',
        },
        green: {
          50: '#E1F5EE', 100: '#9FE1CB', 200: '#5DCAA5',
          400: '#1D9E75', 600: '#0F6E56', 800: '#085041', 900: '#04342C',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px', '2xl': '16px',
      },
    },
  },
  plugins: [],
}
