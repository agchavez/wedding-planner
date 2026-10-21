import { Cormorant_Garamond, Great_Vibes } from "next/font/google";

/** Tipografías de la invitación: caligráfica para los nombres y serif clásica para el texto. */
export const invitationScript = Great_Vibes({ variable: "--font-inv-script", subsets: ["latin"], weight: "400" });

export const invitationSerif = Cormorant_Garamond({
  variable: "--font-inv-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const invitationFontClasses = `${invitationScript.variable} ${invitationSerif.variable}`;
