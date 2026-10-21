import localFont from "next/font/local";

/**
 * Tipografías de la invitación: caligráfica para los nombres y serif clásica para el texto.
 * Locales (public/fonts, las mismas de la imagen de vista previa) y no de next/font/google:
 * el build no depende de Google Fonts, y Turbopack falla al resolver Cormorant con varios
 * pesos y cursiva desde Google.
 */
export const invitationScript = localFont({
  variable: "--font-inv-script",
  src: "../../../public/fonts/great-vibes-latin-400-normal.ttf",
  weight: "400",
  display: "swap",
});

export const invitationSerif = localFont({
  variable: "--font-inv-serif",
  src: [
    { path: "../../../public/fonts/cormorant-garamond-latin-400-normal.ttf", weight: "400", style: "normal" },
    { path: "../../../public/fonts/cormorant-garamond-latin-400-italic.ttf", weight: "400", style: "italic" },
    { path: "../../../public/fonts/cormorant-garamond-latin-500-normal.ttf", weight: "500", style: "normal" },
    { path: "../../../public/fonts/cormorant-garamond-latin-600-normal.ttf", weight: "600", style: "normal" },
    { path: "../../../public/fonts/cormorant-garamond-latin-600-italic.ttf", weight: "600", style: "italic" },
  ],
  display: "swap",
});

export const invitationFontClasses = `${invitationScript.variable} ${invitationSerif.variable}`;
