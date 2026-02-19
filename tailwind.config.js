/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        stratus: {
          50: "#f0f7ff",
          100: "#d4e9ff",
          200: "#b0d8ff",
          300: "#7cc4ff",
          400: "#3fa8ff",
          500: "#0c8ce9",
          600: "#0670c2",
          700: "#085696",
          800: "#083f6e",
          900: "#062847",
          950: "#062847",
        },
        vfr: "#22c55e",
        mvfr: "#3b82f6",
        ifr: "#ef4444",
        lifr: "#d946ef",
        alert: {
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["SpaceGrotesk"],
        body: ["Inter"],
        mono: ["JetBrainsMono"],
      },
      borderRadius: {
        cloud: "24px",
        control: "12px",
      },
    },
  },
  plugins: [],
};
