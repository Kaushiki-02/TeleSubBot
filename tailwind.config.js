/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    extend: {
      colors: {
        // Dark Backgrounds
        "dark-primary": "#141414", // Base page background (Very Dark Gray)
        "dark-secondary": "#191919", // Card/Section background (Dark Gray)
        "dark-tertiary": "#222222", // Input/Hover background (Medium-Dark Gray)
        "dark-border": "#323232", // Borders (Slightly lighter gray)

        // Text Colors
        "text-primary": "#e5e7eb", // Main text (Light Gray/Off-White)
        "text-secondary": "#9ca3af", // Subdued text (Medium Gray)
        "text-disabled": "#6b7280", // Disabled text (Darker Gray)
        "text-on-accent": "#151616", // Text on golden background (Dark Gray/Almost Black)

        // Primary Accent (Golden)
        "golden-accent": "#ffbc06", // Amber 500 (Primary Golden)
        "golden-accent-hover": "#f9e561", // Amber 600 (Hover Golden)
        "golden-focus-ring": "#ffbc06", // Use main accent for focus rings
        "golden-subtle": "#f9e561", // Amber 400 (Subtler golden highlight/text)

        // Status Colors (Semantic)
        "status-active": "#22c55e", // Green 500
        "status-expired": "#9ca3af", // Gray 400
        "status-revoked": "#ef4444", // Red 500
        "status-pending": "#eab308", // Yellow 500
        "status-inactive": "#6b7280", // Gray 500

        // Functional Colors (Semantic)
        "functional-danger": "#ef4444", // Red 500
        "functional-success": "#22c55e", // Green 500
        "functional-warning": "#eab308", // Yellow 500
        "functional-info": "#3b82f6", // Blue 500
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.4" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        fadeInScale: {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        ripple: "ripple 600ms linear",
        "fade-in-scale": "fadeInScale 0.2s ease-out forwards",
      },
      fontFamily: {
        // Custom fonts
        timeburner: ["TimeBurner", "sans-serif"], // The custom font you've defined
      },
    },
  },

  plugins: [],
};
