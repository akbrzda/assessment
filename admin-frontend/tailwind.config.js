/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic токены через CSS-переменные (поддерживают dark mode автоматически)
        background: "var(--bg-primary)",
        surface: "var(--surface-card)",
        muted: "var(--bg-secondary)",
        foreground: "var(--text-primary)",
        "muted-foreground": "var(--text-secondary)",
        border: "var(--divider)",
        "nav-bg": "var(--nav-bg)",
        "nav-active": "var(--nav-active-bg)",
        "nav-active-text": "var(--nav-active-text)",
        "nav-hover": "var(--nav-hover-bg)",
        // Акцентные цвета
        "accent-blue": "var(--accent-blue)",
        "accent-blue-soft": "var(--accent-blue-soft)",
        "accent-green": "var(--accent-green)",
        "accent-green-soft": "var(--accent-green-soft)",
        "accent-orange": "var(--accent-orange)",
        "accent-orange-soft": "var(--accent-orange-soft)",
        "accent-purple": "var(--accent-purple)",
        "accent-purple-soft": "var(--accent-purple-soft)",
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "10px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
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
      },
      keyframes: {
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};
