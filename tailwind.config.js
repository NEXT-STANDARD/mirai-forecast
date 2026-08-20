/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        world: '#38bdf8',
        japan: '#f43f5e',
        gold: '#fbbf24',
      }
    },
  },
  plugins: [],
}
