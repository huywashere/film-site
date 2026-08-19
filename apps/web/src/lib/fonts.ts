import { Be_Vietnam_Pro } from "next/font/google";

export const cardFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

export const heroSerifFont = cardFont;
