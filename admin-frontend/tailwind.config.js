/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Цвета для навигации
        "nav-active": "hsl(var(--nav-active))",
        "nav-active-text": "hsl(var(--nav-active-text))",
        // Акцентные цвета (для статусов и тегов)
        "accent-blue": "hsl(var(--accent-blue))",
        "accent-blue-soft": "hsl(var(--accent-blue-soft))",
        "accent-green": "hsl(var(--accent-green))",
        "accent-green-soft": "hsl(var(--accent-green-soft))",
        "accent-orange": "hsl(var(--accent-orange))",
        "accent-orange-soft": "hsl(var(--accent-orange-soft))",
        "accent-purple": "hsl(var(--accent-purple))",
        "accent-purple-soft": "hsl(var(--accent-purple-soft))",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgb(0 0 0 / 0.04)",
        DEFAULT: "0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04)",
        md: "0 4px 8px rgb(0 0 0 / 0.06), 0 2px 4px rgb(0 0 0 / 0.04)",
        lg: "0 8px 20px rgb(0 0 0 / 0.06), 0 2px 6px rgb(0 0 0 / 0.04)",
        xl: "0 12px 28px rgb(0 0 0 / 0.08), 0 4px 10px rgb(0 0 0 / 0.04)",
        "2xl": "0 20px 40px rgb(0 0 0 / 0.10)",
        modal: "0 8px 32px rgb(0 0 0 / 0.12), 0 2px 8px rgb(0 0 0 / 0.06)",
      },
      zIndex: {
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        "modal-backdrop": "1040",
        modal: "1050",
        popover: "1060",
        toast: "1070",
      },
      animation: {
        "skeleton-pulse": "skeleton-pulse 1.8s ease-in-out infinite",
        spin: "spin 0.8s linear infinite",
        in: "in 0.15s ease-out",
        out: "out 0.1s ease-in",
        "fade-in": "fade-in 0.15s ease-out",
        "fade-out": "fade-out 0.1s ease-in",
        "zoom-in": "zoom-in 0.15s ease-out",
        "zoom-out": "zoom-out 0.1s ease-in",
        "slide-in-from-top-2": "slide-in-from-top-2 0.15s ease-out",
        "slide-in-from-bottom-2": "slide-in-from-bottom-2 0.15s ease-out",
      },
      keyframes: {
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "zoom-in": { from: { transform: "scale(0.95)" }, to: { transform: "scale(1)" } },
        "zoom-out": { from: { transform: "scale(1)" }, to: { transform: "scale(0.95)" } },
        "slide-in-from-top-2": { from: { transform: "translateY(-8px)" }, to: { transform: "translateY(0)" } },
        "slide-in-from-bottom-2": { from: { transform: "translateY(8px)" }, to: { transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
