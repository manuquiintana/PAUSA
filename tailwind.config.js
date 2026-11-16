/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: '#F7F4EE',
        salvia: { DEFAULT: '#6F9A82', oscuro: '#4F7562', claro: '#DCE8E0' },
        tinta: '#1F2A2E',
        coral: { DEFAULT: '#E58F6E', claro: '#F8E1D7' },
        neutro: { DEFAULT: '#8A9499', oscuro: '#5E686D' },
        // Un color por módulo, derivado de la paleta
        modulo: {
          stretch: '#6F9A82',
          breathe: '#7FA7B3',
          mindfulness: '#9A8FB5',
          positive: '#E58F6E',
          reset: '#C9A86A',
        },
      },
      fontFamily: {
        titulo: ['Fraunces', 'Georgia', 'serif'],
        texto: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
}
