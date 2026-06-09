/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand (matches the new design system tokens)
        navy: { DEFAULT: '#1B2D5B', dark: '#0f1d3d', deep: '#0a1530', soft: '#2a4a8a', light: '#2a4a8a' },
        orange: { DEFAULT: '#F5831F', dark: '#d96f15', soft: '#ffb05e', light: '#f9a85c' },
        // Cool-tinted neutrals
        ink: { DEFAULT: '#0f1b34', 2: '#475069', 3: '#8089a0' },
        line: '#e4e9f2',
        canvas: { DEFAULT: '#f5f7fb', 2: '#eef2f8' },
        // Sector accents
        sector: { civil: '#1B2D5B', arch: '#7c3aed', elec: '#F5831F', mech: '#0F6E56' },
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
        sans: ['Cairo', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
        cairo: ['Cairo', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      borderRadius: {
        sm: '10px', md: '16px', xl: '12px', '2xl': '16px',
        lg2: '22px', xl2: '30px', pill: '100px',
      },
      boxShadow: {
        sm2: '0 1px 3px rgba(15,27,52,.06), 0 1px 2px rgba(15,27,52,.04)',
        md2: '0 8px 24px -8px rgba(15,27,52,.16), 0 2px 6px rgba(15,27,52,.06)',
        lg2: '0 30px 70px -24px rgba(15,27,52,.32)',
        orange: '0 12px 30px -8px rgba(245,131,31,.5)',
      },
      maxWidth: { content: '1200px' },
    },
  },
  plugins: [],
}
