import type { Config } from "tailwindcss"; // <-- Perbaikan di sini

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Variabel warna dinamis (Theme Builder)
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        // New Dashboard Colors
        "bg-dark": "#0f111a",
        "bg-card": "rgba(30, 41, 59, 0.3)",
        "soft-cyan": "#22d3ee",
        "soft-cyan-glow": "rgba(34, 211, 238, 0.3)",
        "muted-emerald": "#34d399",
        "muted-slate": "#64748b",
        "deep-navy": "#1e293b",
        "border-white": "rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: {
        // Radius dinamis
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // New Dashboard Radius
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "glow": "0 0 20px rgba(34, 211, 238, 0.15)",
        "glow-sm": "0 0 10px rgba(34, 211, 238, 0.1)",
      }
    },
  },
  plugins: [],
};

export default config;