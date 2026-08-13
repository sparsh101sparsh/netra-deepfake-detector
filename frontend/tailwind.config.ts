import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-lexend)", "var(--font-sans)", "var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        inter: ["var(--font-lexend)", "var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-lexend)", "var(--font-display)", "system-ui", "sans-serif"],
        lexend: ["var(--font-lexend)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
      colors: {
        // Surfaces — OKLCH Dark Elevation System
        page: "var(--page)",
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        inset: "var(--inset)",
        hover: "var(--hover)",
        "hover-2": "var(--hover-2)",
        field: "var(--field)",
        stripe: "var(--stripe)",
        "stripe-bg": "var(--stripe-bg)",

        // Ink Ramp
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-primary": "var(--ink-primary)",
        "ink-secondary": "var(--ink-secondary)",
        "ink-muted": "var(--ink-muted)",

        // Borders & Lines
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        "line-soft": "var(--line-soft)",

        // Accents & Semantics
        accent: {
          DEFAULT: "var(--accent)",
          ink: "var(--accent-ink)",
          tint: "var(--accent-tint)",
        },
        green: {
          DEFAULT: "var(--green)",
          tint: "var(--green-tint)",
        },
        orange: {
          DEFAULT: "var(--orange)",
          tint: "var(--orange-tint)",
        },
        red: {
          DEFAULT: "var(--red)",
          tint: "var(--red-tint)",
        },
        purple: {
          DEFAULT: "var(--purple)",
          tint: "var(--purple-tint)",
        },
        brand: {
          cyan: "var(--brand-cyan)",
          amber: "var(--brand-amber)",
        },

        // Tooltip
        tooltip: {
          bg: "var(--tooltip-bg)",
          fg: "var(--tooltip-fg)",
          muted: "var(--tooltip-muted)",
          border: "var(--tooltip-border)",
        },

        // Backward compatibility mappings
        border: "var(--border)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "var(--accent)",
        background: "var(--page)",
        foreground: "var(--ink)",
        primary: {
          DEFAULT: "var(--ink)",
          foreground: "var(--page)",
        },
        secondary: {
          DEFAULT: "var(--surface)",
          foreground: "var(--ink)",
        },
        destructive: {
          DEFAULT: "var(--red)",
          foreground: "var(--ink)",
        },
        muted: {
          DEFAULT: "var(--inset)",
          foreground: "var(--ink-2)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--ink)",
        },
        popover: {
          DEFAULT: "var(--surface)",
          foreground: "var(--ink)",
        },
      },
      boxShadow: {
        hairline: "var(--shadow-hairline)",
        btn: "var(--shadow-btn)",
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)",
        "inset-field": "var(--shadow-inset-field)",
        "forensic-glow": "var(--shadow-forensic-glow)",
      },
      borderRadius: {
        chip: "var(--radius-chip, 6px)",
        control: "var(--radius-control, 8px)",
        card: "var(--radius-card, 10px)",
        window: "var(--radius-window, 14px)",
        lg: "var(--radius, 0.75rem)",
        md: "calc(var(--radius, 0.75rem) - 2px)",
        sm: "calc(var(--radius, 0.75rem) - 4px)",
      },
      transitionTimingFunction: {
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
        link: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "shimmer-text": {
          from: { backgroundPosition: "150% center" },
          to: { backgroundPosition: "-50% center" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pixel-on": {
          "0%, 100%": { opacity: "0.15" },
          "18%, 42%": { opacity: "1" },
          "62%": { opacity: "0.15" },
        },
        "eq-bounce": {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "radar-sweep": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "shimmer-text": "shimmer-text 1.8s linear infinite",
        "fade-up": "fade-up 350ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "fade-in": "fade-in 200ms ease-out both",
        "pop-in": "pop-in 200ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "pixel-on": "pixel-on 650ms ease-in-out infinite",
        "eq-bounce": "eq-bounce 1s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "radar-sweep": "radar-sweep 4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
