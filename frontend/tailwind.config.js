/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
      colors: {
        navy:    { 50:'#eef1f8',100:'#d0d8ee',200:'#a8b8dd',300:'#7591c7',400:'#4d6eb2',500:'#2d4f96',600:'#1e3a7a',700:'#152d61',800:'#0e2049',900:'#081433' },
        slate:   { 50:'#f4f5f7',100:'#e2e5ec',200:'#c5cad6',300:'#9fa7b8',400:'#737f96',500:'#566070',600:'#424c5c',700:'#303847',800:'#1f2533',900:'#111827' },
        gold:    { 50:'#fdf8ec',100:'#f9edca',200:'#f3d98a',300:'#ebbe45',400:'#d9a520',500:'#b8891a',600:'#916c14',700:'#6b4f0f' },
        emerald: { 50:'#edf7f2',100:'#c6e8d8',200:'#88d0b0',300:'#46b383',400:'#229163',500:'#0f7048',600:'#0a5436',700:'#073d27' },
        rose:    { 50:'#fef0f2',100:'#fcd5da',200:'#f9a8b3',300:'#f3677a',400:'#e83451',500:'#c91e3b',600:'#a0172e',700:'#771021' },
        amber:   { 50:'#fff8ec',100:'#fdecc8',200:'#fad48a',300:'#f5b43b',400:'#e8950f',500:'#c47a09',600:'#9a5f07',700:'#714605' },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
