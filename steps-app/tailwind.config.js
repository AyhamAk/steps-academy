/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bark: "#2C2416",
        cream: "#FFFDF8",
        linen: "#F5EFE4",
        terracotta: "#E07A3A",
        forest: "#5B8A5E",
        honey: "#D4A843",
        sky: "#7B9EC4",
        clay: "#C4756A",
      },
    },
  },
  plugins: [],
};
