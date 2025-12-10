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
      },
      borderRadius: {
        // Radius dinamis
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      }
    },
  },
  plugins: [],
};

export default config;