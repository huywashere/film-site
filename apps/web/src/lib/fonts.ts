import { Be_Vietnam_Pro, Bebas_Neue } from "next/font/google";

export const cardFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  // Three real cuts cover body, headings and display text. Intermediate
  // utility weights are synthesized without preloading dozens of font files.
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-be-vietnam",
  preload: true,
});

export const logoFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-bebas-neue",
  preload: true,
});

export const heroSerifFont = cardFont;
