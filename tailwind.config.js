/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      keyframes: {
        "scroll-left": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      animation: {
        "scroll-left": "scroll-left linear infinite",
      },
      fontFamily: {
        cancun: ["Cancun"],
      },
      height: {
        maxxx: "100rem",
      },
      colors: {
        primaryGreen: "#009746",
        primaryBlue: "#393186",
        primaryRed: "#E31E25",
        primaryPink: "#E7087E",
      },
    },
  },
  variants: {
    extend: {
      display: ["print"],   // important
    },
  },
  plugins: [],
};
