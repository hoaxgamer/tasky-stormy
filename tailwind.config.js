export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        storm: { 400: '#818cf8', 500: '#6366f1' },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'slide-in-up': 'slideInUp 0.2s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'bounce-in': 'bounceIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        'fade-in': 'fadeIn 0.15s ease both',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        slideInUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        bounceIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
