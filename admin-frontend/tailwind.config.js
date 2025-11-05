/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0088cc",
          hover: "#007ab8",
          light: "rgba(0, 136, 204, 0.12)",
        },
        success: {
          DEFAULT: "#34c759",
          light: "rgba(52, 199, 89, 0.12)",
        },
        warning: {
          DEFAULT: "#ff9500",
          light: "rgba(255, 149, 0, 0.12)",
        },
        danger: {
          DEFAULT: "#ef4444",
          light: "rgba(239, 68, 68, 0.1)",
        },
        info: {
          DEFAULT: "#af52de",
          light: "rgba(175, 82, 222, 0.12)",
        },
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "10px",
        md: "10px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm: "0 2px 8px rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 4px 12px rgba(0, 0, 0, 0.08)",
        md: "0 8px 20px rgba(0, 0, 0, 0.1)",
        lg: "0 12px 28px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};
