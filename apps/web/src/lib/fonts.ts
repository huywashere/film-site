import { Inter, Noto_Serif } from "next/font/google";

export const cardFont = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
});

export const heroSerifFont = Noto_Serif({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: true,
});
