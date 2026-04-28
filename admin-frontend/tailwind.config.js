/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
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
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        sm: "0 2px 8px rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 4px 12px rgba(0, 0, 0, 0.08)",
        md: "0 8px 20px rgba(0, 0, 0, 0.1)",
        lg: "0 12px 28px rgba(0, 0, 0, 0.12)",
        modal: "0 20px 60px rgba(0, 0, 0, 0.3)",
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
