import type { Metadata } from "next";
import { Geist_Mono, Playfair_Display, Geist } from "next/font/google";
import { CUSTOM_COLORS_STORAGE_KEY, CUSTOM_COLOR_KEYS, DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wedplan",
  description: "Planificación de boda: presupuesto, invitados, canciones, línea de tiempo y distribución del salón.",
};

const themeInitScript = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || ${JSON.stringify(DEFAULT_THEME)};
  document.documentElement.setAttribute("data-theme", t);
  var raw = localStorage.getItem(${JSON.stringify(CUSTOM_COLORS_STORAGE_KEY)});
  if (raw) {
    var custom = JSON.parse(raw);
    var keys = ${JSON.stringify(CUSTOM_COLOR_KEYS)};
    for (var i = 0; i < keys.length; i++) {
      var v = custom[keys[i]];
      if (v) document.documentElement.style.setProperty("--" + keys[i], v);
    }
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-background">{children}</body>
    </html>
  );
}
