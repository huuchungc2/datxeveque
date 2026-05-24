import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: { 50: '#eff6ff', 600: '#2563eb', 700: '#1d4ed8', 900: '#0f172a' }, cta: '#f97316' },
      boxShadow: { soft: '0 18px 45px rgba(15,23,42,.08)' }
    }
  },
  plugins: []
} satisfies Config;
