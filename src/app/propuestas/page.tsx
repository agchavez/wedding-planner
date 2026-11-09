import type { Metadata } from "next";
import { Proposals } from "./Proposals";

export const metadata: Metadata = {
  title: "Propuestas · Angel & Indira",
  robots: { index: false },
};

/**
 * Propuestas de invitación (solo local). ?estilo=editorial|hacienda|gala|minimal,
 * ?para=Nombre del invitado, ?lugares=N para simular la invitación personal.
 */
export default async function PropuestasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const seats = Math.min(10, Math.max(1, Number(one(sp.lugares)) || 2));
  return <Proposals initial={one(sp.estilo) ?? "editorial"} guest={{ name: one(sp.para) || "Familia Martínez", seats }} />;
}
