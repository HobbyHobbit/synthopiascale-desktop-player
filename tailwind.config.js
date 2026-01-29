/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors (use CSS variables)
        'theme-bg': 'var(--theme-bg)',
        'theme-surface': 'var(--theme-surface)',
        'theme-surface-alt': 'var(--theme-surface-alt)',
        'theme-text': 'var(--theme-text)',
        'theme-text-soft': 'var(--theme-text-soft)',
        'theme-accent': 'var(--theme-accent)',
        'theme-accent-soft': 'var(--theme-accent-soft)',
        'theme-border': 'var(--theme-border)',
        // Legacy colors (for backwards compatibility during migration)
        background: 'var(--theme-bg)',
        foreground: 'var(--theme-text)',
        primary: 'var(--theme-accent-soft)',
        'primary-solid': 'var(--theme-accent)',
        muted: 'rgba(255, 255, 255, 0.04)',
        'muted-foreground': 'var(--theme-text-soft)',
        border: 'var(--theme-border)',
        card: 'var(--theme-surface)',
        gold: {
          DEFAULT: 'var(--theme-accent-soft)',
          solid: 'var(--theme-accent)',
          glow: 'var(--theme-accent-soft)',
        },
        silver: 'rgba(200, 210, 220, 0.4)',
        charcoal: {
          DEFAULT: 'var(--theme-bg)',
          light: 'var(--theme-surface)',
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
