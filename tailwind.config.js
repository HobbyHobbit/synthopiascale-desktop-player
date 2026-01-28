/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1114',
        foreground: '#e8eaed',
        primary: 'rgba(212, 175, 55, 0.6)',
        'primary-solid': '#d4af37',
        muted: 'rgba(255, 255, 255, 0.04)',
        'muted-foreground': 'rgba(232, 234, 237, 0.6)',
        border: 'rgba(200, 205, 210, 0.1)',
        card: 'rgba(255, 255, 255, 0.05)',
        gold: {
          DEFAULT: 'rgba(212, 175, 55, 0.6)',
          solid: '#d4af37',
          glow: 'rgba(212, 175, 55, 0.12)',
        },
        silver: 'rgba(200, 210, 220, 0.4)',
        charcoal: {
          DEFAULT: '#0f1114',
          light: '#151719',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        'float': 'float 10s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '0.4' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-15px) translateX(8px)' },
          '50%': { transform: 'translateY(-8px) translateX(-8px)' },
          '75%': { transform: 'translateY(-20px) translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
}
