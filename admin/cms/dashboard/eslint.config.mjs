import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", ".next-dev/**", "node_modules/**", "out/**"],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default config;
