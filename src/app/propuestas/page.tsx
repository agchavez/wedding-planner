import type { Metadata } from "next";
import { Proposals } from "./Proposals";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const guestName = (v: string | string[] | undefined) => (one(v) || "Indira Victoria Lopez").trim().slice(0, 60);

/** Vista previa al compartir por WhatsApp: tarjeta con la foto y el nombre de quien la recibe. */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const name = guestName(sp.para);
  const first = name.split(/\s+/)[0];
  const title = `${first}, te invitamos a la boda de Angel & Indira`;
  const description = "Sábado 12 de diciembre de 2026 · La Hacienda El Encanto de Jeto, Comayagua. Abre tu invitación 💌";
  const image = `/propuestas/og?para=${encodeURIComponent(name)}`;
  return {
    title: "Boda de Angel & Indira",
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "Angel & Indira",
      locale: "es_HN",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, type: "image/jpeg" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/**
 * Propuestas de invitación (solo local). ?estilo=editorial|hacienda|gala|minimal,
 * ?para=Nombre del invitado, ?lugares=N para simular la invitación personal.
 */
export default async function PropuestasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const seats = Math.min(10, Math.max(1, Number(one(sp.lugares)) || 2));
  return <Proposals initial={one(sp.estilo) ?? "editorial"} guest={{ name: guestName(sp.para), seats }} />;
}
