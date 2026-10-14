/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand (matches the new design system tokens)
        navy: { DEFAULT: '#0B2438', dark: '#071827', deep: '#050B12', soft: '#102E45', light: '#102E45' },
        orange: { DEFAULT: '#D4A543', dark: '#9D7425', soft: '#F5C55B', light: '#FFCF70' },
        // Cool-tinted neutrals
        ink: { DEFAULT: '#10243B', 2: '#48596E', 3: '#728196' },
        line: '#D9E0E8',
        canvas: { DEFAULT: '#F5F7FA', 2: '#E8EDF2' },
        // Sector accents
        sector: { civil: '#0B2438', arch: '#435A70', elec: '#D4A543', mech: '#0F6E56' },
        // Legacy scales kept for existing pages
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
        sans: ['IBM Plex Sans Arabic', 'Tajawal', 'Cairo', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
        cairo: ['IBM Plex Sans Arabic', 'Tajawal', 'Cairo', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      borderRadius: {
        sm: '10px', md: '16px', xl: '12px', '2xl': '16px',
        lg2: '22px', xl2: '30px', pill: '100px',
      },
      boxShadow: {
        sm2: '0 1px 3px rgba(7,24,39,.06), 0 1px 2px rgba(7,24,39,.04)',
        md2: '0 8px 24px -8px rgba(7,24,39,.16), 0 2px 6px rgba(7,24,39,.06)',
        lg2: '0 30px 70px -24px rgba(5,11,18,.32)',
        orange: '0 12px 30px -8px rgba(212,165,67,.35)',
      },
      maxWidth: { content: '1360px' },
    },
  },
  plugins: [],
}
