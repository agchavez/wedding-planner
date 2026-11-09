import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { prisma } from "@/lib/prisma";
import { getDriveConnection } from "@/lib/googleDrive";
import { GUEST_LABEL_PREFIX } from "./constants";
import { GuestUpload } from "./GuestUpload";

export const dynamic = "force-dynamic";

async function loadWedding(weddingId: string) {
  if (!ObjectId.isValid(weddingId)) return null;
  return prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { id: true, partner1: true, partner2: true, weddingDate: true },
  });
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export async function generateMetadata({ params }: PageProps<"/compartir/[weddingId]">): Promise<Metadata> {
  const wedding = await loadWedding((await params).weddingId);
  const couple = [wedding?.partner1, wedding?.partner2].filter(Boolean).map((n) => firstName(n!)).join(" & ");
  return {
    title: couple ? `Comparte tus fotos · ${couple}` : "Comparte tus fotos",
    description: "Sube las fotos y videos que tomaste en la boda.",
    robots: { index: false, follow: false },
  };
}

/** Página pública (a la que lleva el QR de las mesas) para que los invitados suban sus fotos. */
export default async function SharePhotosPage({ params }: PageProps<"/compartir/[weddingId]">) {
  const { weddingId } = await params;
  const wedding = await loadWedding(weddingId);
  if (!wedding) notFound();

  const [connection, items] = await Promise.all([
    getDriveConnection(weddingId),
    prisma.mediaItem.findMany({
      where: { weddingId, label: { startsWith: GUEST_LABEL_PREFIX }, driveFileId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, driveFileId: true, type: true, label: true },
    }),
  ]);

  return (
    <GuestUpload
      weddingId={weddingId}
      partner1={firstName(wedding.partner1)}
      partner2={firstName(wedding.partner2)}
      dateIso={wedding.weddingDate?.toISOString() ?? null}
      enabled={Boolean(connection?.refreshToken)}
      initial={items.map((item) => ({
        id: item.id,
        driveFileId: item.driveFileId!,
        type: item.type,
        by: item.label.slice(GUEST_LABEL_PREFIX.length),
      }))}
    />
  );
}
