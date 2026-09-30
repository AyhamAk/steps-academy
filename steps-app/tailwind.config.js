/** @type {import('tailwindcss').Config} */
// Kept in step with src/constants/Colors.ts — the sage & gold palette.
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bark: "#2C2A24",
        cream: "#FFFCF5",
        linen: "#F6EEDF",
        background: "#FBF6EC",
        sage: "#4F8074",
        gold: "#D9A441",
        blue: "#4A90A4",
        rose: "#C97B72",
        coral: "#C15B45",
      },
    },
  },
  plugins: [],
};
