/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // High-contrast Dark & Energetic palette
        background: '#080F19',
        surface: '#0D1726',
        'surface-elevated': '#132238',
        'surface-hover': '#182A42',
        primary: '#3866FF',
        'primary-bright': '#4A7BFF',
        secondary: '#8B5CF6',
        accent: '#06B6D4',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',

        // Typography text tokens
        'text-primary': '#F8FAFC',
        'text-secondary': '#AAB6C5',
        'text-muted': '#64748B',

        // Borders
        'border-subtle': 'rgba(255, 255, 255, 0.08)',
        'border-strong': 'rgba(255, 255, 255, 0.16)',

        // Backward compatibility aliases
        card: '#0D1726',
        'card-border': 'rgba(255, 255, 255, 0.08)',
        'neon-lime': '#22C55E',
        'cyber-cyan': '#06B6D4',
        'electric-purple': '#8B5CF6',
        'sunset-orange': '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 24px -4px rgba(56, 102, 255, 0.45)',
        'glow-success': '0 0 24px -4px rgba(34, 197, 94, 0.45)',
        'glow-accent': '0 0 24px -4px rgba(6, 182, 212, 0.45)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe': 'breathe 19s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(56, 102, 255, 0.6))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 5px rgba(56, 102, 255, 0.2))' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '21%': { transform: 'scale(1.2)', opacity: '1' },
          '58%': { transform: 'scale(1.2)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
