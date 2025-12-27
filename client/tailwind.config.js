/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#202124', // Google Meet background
          800: '#3c4043', // Surface
        }
      }
    },
  },
  plugins: [],
}