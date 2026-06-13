import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palantir Gotham–style intelligence palette
        bg: "#0a0e14",
        well: "#070b11",
        panel: "#0b101a",
        surface: "#0d1320",
        line: "#1c2530",
        line2: "#27384a",
        ink: "#c9d4e0",
        muted: "#7d8da0",
        dim: "#4a5970",
        cyan: "#5fd3f0",
        danger: "#e2524b",
        dangerGlow: "#ff8a83",
        amber: "#d6a943",
        node: "#2f7fa0",
        purple: "#a98fd0",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
