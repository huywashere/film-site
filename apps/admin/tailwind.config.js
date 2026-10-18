/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", 'html[data-admin-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--admin-canvas)",
        foreground: "var(--admin-ink)",
        card: "var(--admin-surface)",
        "card-foreground": "var(--admin-ink)",
        popover: "var(--admin-surface)",
        "popover-foreground": "var(--admin-ink)",
        primary: {
          DEFAULT: "var(--admin-brand)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--admin-surface-muted)",
          foreground: "var(--admin-ink)",
        },
        muted: {
          DEFAULT: "var(--admin-surface-muted)",
          foreground: "var(--admin-muted)",
        },
        accent: {
          DEFAULT: "var(--admin-surface-muted)",
          foreground: "var(--admin-ink)",
        },
        border: "var(--admin-line)",
        sidebar: {
          DEFAULT: "var(--admin-sidebar)",
          foreground: "var(--admin-sidebar-ink)",
          border: "var(--admin-sidebar-line)",
          accent: "var(--admin-sidebar-accent)",
        },
        panel: "#161b22",
        panelBorder: "#30363d",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
