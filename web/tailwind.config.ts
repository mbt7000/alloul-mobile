import type { Config } from 'tailwindcss'

// ALLOUL&Q — brand palette extracted from the real logo
//   primary: logo blue "A"     #2E8BFF
//   secondary: logo green "Q"  #14E0A4
//   accent: logo lens cyan     #00D4FF
//   dark bg: deep space        #050810 → #0F1626

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary = logo blue (the "A")
        primary: {
          DEFAULT: '#2E8BFF',
          50:  '#EAF3FF',
          100: '#CFE2FF',
          200: '#A6CAFF',
          300: '#78AFFF',
          400: '#4C9CFF',
          500: '#2E8BFF',
          600: '#1E6BE0',
          700: '#1955B8',
          800: '#123F8A',
          900: '#0A2758',
        },
        // Secondary = logo green (the "Q")
        secondary: {
          DEFAULT: '#14E0A4',
          50:  '#E6FFF7',
          100: '#B8FFE7',
          200: '#85FBD5',
          300: '#4EF2BF',
          400: '#26E8AE',
          500: '#14E0A4',
          600: '#0AA578',
          700: '#087A58',
          800: '#055238',
          900: '#02301F',
        },
        // Accent = logo lens cyan
        accent: {
          DEFAULT: '#00D4FF',
          50:  '#E6FAFF',
          100: '#BDF2FF',
          200: '#8AE8FF',
          300: '#4FD9FF',
          400: '#1FCCFF',
          500: '#00D4FF',
          600: '#00A6CC',
          700: '#007999',
          800: '#005066',
          900: '#002933',
        },
        // Dark background — deep space from the logo
        'dark-bg': {
          DEFAULT: '#050810',
          50:  '#F5F8FC',
          100: '#E8EEF7',
          200: '#CBD6E8',
          300: '#8E9FC0',
          400: '#5A6B8C',
          500: '#2E3D5E',
          600: '#1A2440',
          700: '#131B2E',
          800: '#0F1626',
          900: '#050810',
        },
        // Semantic
        success: '#14E0A4',
        warning: '#FFB24D',
        danger:  '#FF4757',
      },
      backgroundImage: {
        'gradient-logo':    'linear-gradient(135deg, #2E8BFF 0%, #14E0A4 100%)',
        'gradient-primary': 'linear-gradient(135deg, #2E8BFF 0%, #1E6BE0 100%)',
        'gradient-accent':  'linear-gradient(135deg, #00D4FF 0%, #2E8BFF 100%)',
        'gradient-dark':    'linear-gradient(180deg, #050810 0%, #0F1626 100%)',
      },
      fontFamily: {
        sans:   ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-tajawal)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary':   '0 0 40px rgba(46,139,255,0.35)',
        'glow-secondary': '0 0 40px rgba(20,224,164,0.35)',
        'glow-accent':    '0 0 40px rgba(0,212,255,0.35)',
      },
      direction: ['ltr', 'rtl'],
    },
  },
  plugins: [],
  darkMode: 'class',
}

export default config
