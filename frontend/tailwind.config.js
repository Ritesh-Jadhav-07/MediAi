/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#e6f7f7',
          100: '#b3e8e8',
          200: '#80d9d9',
          300: '#4dcaca',
          400: '#26bfbf',
          500: '#0f9b8e',
          600: '#0d8377',
          700: '#0a6b61',
          800: '#07534b',
          900: '#043b35',
        },
        secondary: {
          50: '#eef0f9',
          100: '#cdd2ed',
          200: '#abb4e1',
          300: '#8996d5',
          400: '#6e7ecc',
          500: '#4f63b8',
          600: '#3f4f93',
          700: '#2f3b6e',
          800: '#1f274a',
          900: '#101325',
        },
      },
      boxShadow: {
        'focus-primary': '0 0 0 3px rgba(15, 155, 142, 0.2)',
        'focus-error': '0 0 0 3px rgba(231, 76, 60, 0.15)',
      },
      animation: {
        'slide-up': 'slideUp 200ms ease',
        'fade-in': 'fadeIn 150ms ease',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
