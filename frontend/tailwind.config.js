export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF8F1',
          100: '#FFECDB',
          200: '#FFD5B0',
          300: '#FFB878',
          400: '#FF9A45',
          500: '#E8792B',
          600: '#C75E1A',
          700: '#A14A14',
          800: '#7A3810',
          900: '#5A290C',
        },
        accent: {
          50: '#FFF5F5',
          100: '#FFE3E3',
          500: '#E53E3E',
          600: '#C53030',
          700: '#9B2C2C',
        },
        ink: '#1A1A2E',
        paper: '#F7F5F2',
        warm: { 50: '#FFFCF9', 100: '#FFF5EC', 200: '#FFE8D1' },
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Figtree', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
        'elevated': '0 10px 30px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.04)',
        'glow': '0 0 20px rgba(232,121,43,0.15)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #1A1A2E 0%, #2D2D48 50%, #3D2D3D 100%)',
        'gradient-warm': 'linear-gradient(135deg, #FF9A45 0%, #E8792B 50%, #C53030 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { '0%': { opacity: '0', transform: 'translateX(-10px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
};
