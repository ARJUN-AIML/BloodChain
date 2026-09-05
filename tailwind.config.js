/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FBFBFA',
          100: '#F7F7F5',
          200: '#EAEAE5',
          300: '#E2E2DC',
        },
        stone: {
          50: '#FAF9F6',
          100: '#F4F4F0',
          200: '#E2E2DC',
          300: '#D4D4CE',
          400: '#A3A39A',
        },
        charcoal: {
          DEFAULT: '#1A1F26',
          900: '#11151C',
          800: '#1A1F26',
          700: '#2A313C',
          600: '#3D4756',
        },
        rust: {
          DEFAULT: '#C85A3F',
          50: '#FDF6F0',
          100: '#F8EBE2',
          200: '#F1D6C5',
          500: '#C85A3F',
          600: '#B24930',
          700: '#943822',
        },
        sage: {
          DEFAULT: '#5B8C7A',
          50: '#F2F7F5',
          100: '#E3EFEA',
          200: '#C7DFC7',
          500: '#5B8C7A',
          600: '#477262',
          700: '#36584B',
        },
        amber: {
          warm: '#D99B38',
          50: '#FDF8EE',
          100: '#FAF0D6',
          500: '#D99B38',
          600: '#BE8226',
        },
        steel: {
          DEFAULT: '#5C768D',
          50: '#F3F6F8',
          100: '#E4EBF0',
          500: '#5C768D',
          600: '#475D70',
        },
        border: '#E2E2DC',
        input: '#E2E2DC',
        ring: '#C85A3F',
        background: '#F7F7F5',
        foreground: '#1A1F26',
        primary: {
          DEFAULT: '#C85A3F',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F4F4F0',
          foreground: '#1A1F26',
        },
        muted: {
          DEFAULT: '#F4F4F0',
          foreground: '#64748B',
        },
        accent: {
          DEFAULT: '#FDF6F0',
          foreground: '#C85A3F',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1F26',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'flat': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'soft': '0 2px 8px 0 rgba(26, 31, 38, 0.04)',
        'hover': '0 4px 16px 0 rgba(26, 31, 38, 0.06)',
      },
      borderRadius: {
        'lg': '0.625rem',
        'xl': '0.875rem',
        '2xl': '1.125rem',
      },
    },
  },
  plugins: [],
};
