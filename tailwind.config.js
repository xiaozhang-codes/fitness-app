/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        appleBlue: '#007AFF',
        appleGreen: '#34C759',
        appleRed: '#FF3B30',
        appleGray: '#F2F2F7',
        appleDark: '#1C1C1E',
      },
      borderRadius: {
        'apple': '16px',
      },
    },
  },
  plugins: [],
};
