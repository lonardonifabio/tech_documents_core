/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
      colors: {
        linkedin: '#0077B5',
        'linkedin-dark': '#005885',
      },
    },
  },
  plugins: [],
}
