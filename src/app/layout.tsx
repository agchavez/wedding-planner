import type { Metadata } from "next";
import { Geist_Mono, Playfair_Display, Geist } from "next/font/google";
import { AppSidebar } from "@/components/AppSidebar";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";
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
  title: "WeddingPlanner",
  description: "Planificación de boda: presupuesto, invitados, canciones, línea de tiempo y distribución del salón.",
};

const themeInitScript = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || ${JSON.stringify(DEFAULT_THEME)};
  document.documentElement.setAttribute("data-theme", t);
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
      <body className="min-h-full bg-background">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
