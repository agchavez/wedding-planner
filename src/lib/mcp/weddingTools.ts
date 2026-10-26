import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { prisma } from "@/lib/prisma";
import { mongoDb } from "@/lib/mongo";
import { toObjectId } from "@/lib/ids";
import { weddingDisplayName } from "@/lib/wedding";
import { cleanName, CATALOG_NAME_MAX, nameKey } from "@/lib/catalog";
import { checkCatalogName } from "@/lib/catalog-server";
import { isLabelColor, LABEL_COLORS, parseSide, SIDE_LABEL } from "@/lib/guestLabels";
import { buildInvitationLinks, getInvitationSettings, NOT_SENT_FILTER } from "@/lib/guestInvitations";
import { INVITATION_STATUS, invitationStatus, type InvitationStatus } from "@/lib/invitationMessage";
import { isInvitationTheme, INVITATION_THEMES, ITINERARY_ICONS } from "@/lib/invitationThemes";
import { parseEventDateTime, toEventDateTimeValue } from "@/lib/eventTime";
import { auth, editor, httpUrl, json, log, objectId, dateOnly, parseDateOnly, toDateOnlyValue } from "@/lib/mcp/shared";
import type { Guest, GuestLabel } from "@/generated/prisma";

/**
 * Herramientas del servidor MCP (/api/mcp): permiten a un asistente de IA gestionar los
 * datos de la boda, sus invitados, etiquetas, grupos y la invitación digital de UNA boda (la del
 * token). Todo queda en la auditoría.
 */

async function weddingLabels(weddingId: string) {
  return prisma.guestLabel.findMany({ where: { weddingId }, orderBy: { name: "asc" } });
}

/** Ids de etiquetas a partir de nombres; crea las que no existan. */
async function resolveLabels(weddingId: string, names: string[], existing: GuestLabel[]) {
  const ids: string[] = [];
  const palette = Object.keys(LABEL_COLORS);
  for (const raw of names) {
    const name = cleanName(raw).slice(0, 60);
    if (!name) continue;
    let label = existing.find((l) => nameKey(l.name) === nameKey(name));
    if (!label) {
      label = await prisma.guestLabel.create({
        data: { weddingId, name, color: palette[existing.length % palette.length] },
      });
      existing.push(label);
    }
    ids.push(label.id);
  }
  return [...new Set(ids)];
}

function describeGuest(g: Guest, labels: GuestLabel[], url?: string) {
  return {
    id: g.id,
    fullName: g.fullName,
    side: g.side || null,
    labels: g.labelIds.map((id) => labels.find((l) => l.id === id)?.name).filter(Boolean),
    group: g.group || null,
    phone: g.phone || null,
    seats: 1 + g.plusOnes,
    plusOneNames: g.plusOneNames,
    rsvpStatus: g.rsvpStatus,
    attendingCount: g.attendingCount,
    invitationStatus: invitationStatus(g),
    invitationViews: g.invitationViews,
    rsvpMessage: g.rsvpMessage || null,
    dietaryRestrictions: g.dietaryRestrictions || null,
    notes: g.notes || null,
    tableElementId: g.tableElementId || null,
    ...(url ? { invitationUrl: url } : {}),
  };
}

const sideSchema = z.enum(["bride", "groom", "both", "none"]).describe("bride = novia, groom = novio, both = ambos, none = sin definir");
const statusSchema = z.enum(["not_sent", "sent", "opened", "confirmed", "declined"]);

const guestInput = z.object({
  fullName: z.string().min(1).max(120),
  side: sideSchema.optional(),
  labels: z.array(z.string()).optional().describe("Nombres de etiquetas; las que no existan se crean"),
  phone: z.string().max(30).optional().describe("Teléfono de WhatsApp; locales de Honduras sin +504 también sirven"),
  plusOnes: z.number().int().min(0).max(20).optional().describe("Acompañantes además del invitado"),
  plusOneNames: z.array(z.string()).optional(),
  group: z.string().max(60).optional(),
  notes: z.string().max(500).optional(),
  dietaryRestrictions: z.string().max(300).optional(),
  rsvpStatus: z.enum(["pending", "confirmed", "declined"]).optional(),
});

export function registerWeddingTools(server: McpServer) {
  server.registerTool(
    "wedding_overview",
    {
      title: "Resumen de la boda",
      description:
        "Datos de la boda (pareja, fecha, lugar) y totales de invitados por lado (novia/novio), confirmación y estado de la invitación, más las etiquetas disponibles. Úsalo primero para orientarte.",
      annotations: { readOnlyHint: true },
    },
    async (ctx) => {
      const a = auth(ctx);
      const [wedding, guests, labels, settings] = await Promise.all([
        prisma.wedding.findUniqueOrThrow({ where: { id: a.weddingId } }),
        prisma.guest.findMany({ where: { weddingId: a.weddingId } }),
        weddingLabels(a.weddingId),
        getInvitationSettings(a.weddingId),
      ]);
      const count = (fn: (g: Guest) => boolean) => guests.filter(fn).length;
      const bySide = Object.fromEntries(
        ["bride", "groom", "both", ""].map((s) => [SIDE_LABEL[s], { invitations: count((g) => g.side === s), people: guests.filter((g) => g.side === s).reduce((n, g) => n + 1 + g.plusOnes, 0) }])
      );
      const byInvitation = Object.fromEntries(
        (Object.keys(INVITATION_STATUS) as InvitationStatus[]).map((s) => [s, count((g) => invitationStatus(g) === s)])
      );
      return json({
        couple: weddingDisplayName(wedding),
        partner1: wedding.partner1,
        partner2: wedding.partner2,
        weddingDate: wedding.weddingDate?.toISOString().slice(0, 10) ?? null,
        venue: wedding.venueName || null,
        venueAddress: wedding.venueAddress || null,
        currency: wedding.currency,
        yourAccess: a.canEdit ? "edit" : "read-only",
        totals: {
          invitations: guests.length,
          people: guests.reduce((n, g) => n + 1 + g.plusOnes, 0),
          confirmedPeople: guests.filter((g) => g.rsvpStatus === "confirmed").reduce((n, g) => n + (g.attendingCount ?? 1 + g.plusOnes), 0),
          withoutPhone: count((g) => !g.phone),
        },
        bySide,
        byRsvp: { pending: count((g) => g.rsvpStatus === "pending"), confirmed: count((g) => g.rsvpStatus === "confirmed"), declined: count((g) => g.rsvpStatus === "declined") },
        byInvitationStatus: byInvitation,
        labels: labels.map((l) => ({ name: l.name, guests: count((g) => g.labelIds.includes(l.id)) })),
        invitationTheme: settings.theme,
      });
    }
  );

  server.registerTool(
    "list_guests",
    {
      title: "Listar invitados",
      description: "Lista invitados con filtros opcionales por lado, etiqueta, confirmación, estado de la invitación o texto.",
      inputSchema: z.object({
        side: sideSchema.optional(),
        label: z.string().optional().describe("Nombre de una etiqueta"),
        rsvpStatus: z.enum(["pending", "confirmed", "declined"]).optional(),
        invitationStatus: statusSchema.optional(),
        search: z.string().optional(),
        includeLinks: z.boolean().optional().describe("Incluir el enlace personal de invitación"),
        limit: z.number().int().min(1).max(500).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args, ctx) => {
      const a = auth(ctx);
      const [guests, labels] = await Promise.all([
        prisma.guest.findMany({ where: { weddingId: a.weddingId }, orderBy: { fullName: "asc" } }),
        weddingLabels(a.weddingId),
      ]);
      const label = args.label ? labels.find((l) => nameKey(l.name) === nameKey(args.label!)) : null;
      if (args.label && !label) return json({ error: `No existe la etiqueta "${args.label}".`, labels: labels.map((l) => l.name) });
      const q = args.search ? nameKey(args.search) : "";
      const filtered = guests
        .filter((g) => !args.side || g.side === (args.side === "none" ? "" : args.side))
        .filter((g) => !label || g.labelIds.includes(label.id))
        .filter((g) => !args.rsvpStatus || g.rsvpStatus === args.rsvpStatus)
        .filter((g) => !args.invitationStatus || invitationStatus(g) === args.invitationStatus)
        .filter((g) => !q || nameKey(`${g.fullName} ${g.group} ${g.phone}`).includes(q))
        .slice(0, args.limit ?? 200);

      let links = new Map<string, string>();
      if (args.includeLinks && a.canEdit && filtered.length > 0) {
        const [wedding, settings] = await Promise.all([
          prisma.wedding.findUniqueOrThrow({ where: { id: a.weddingId } }),
          getInvitationSettings(a.weddingId),
        ]);
        links = new Map((await buildInvitationLinks(filtered, wedding, settings)).map((l) => [l.guestId, l.url]));
      }
      return json({ count: filtered.length, guests: filtered.map((g) => describeGuest(g, labels, links.get(g.id))) });
    }
  );

  server.registerTool(
    "add_guests",
    {
      title: "Agregar invitados",
      description:
        "Agrega uno o varios invitados (hasta 200 por llamada) con su lado (novia/novio), etiquetas, teléfono y acompañantes. Devuelve sus enlaces personales de invitación.",
      inputSchema: z.object({ guests: z.array(guestInput).min(1).max(200) }),
    },
    async ({ guests: input }, ctx) => {
      const a = editor(ctx);
      const labels = await weddingLabels(a.weddingId);
      const created: Guest[] = [];
      for (const g of input) {
        created.push(
          await prisma.guest.create({
            data: {
              weddingId: a.weddingId,
              fullName: cleanName(g.fullName),
              side: parseSide(g.side === "none" ? "" : g.side),
              labelIds: await resolveLabels(a.weddingId, g.labels ?? [], labels),
              phone: g.phone?.trim() ?? "",
              plusOnes: g.plusOnes ?? 0,
              plusOneNames: g.plusOneNames ?? [],
              group: g.group ?? "",
              notes: g.notes ?? "",
              dietaryRestrictions: g.dietaryRestrictions ?? "",
              rsvpStatus: g.rsvpStatus ?? "pending",
            },
          })
        );
      }
      const [wedding, settings] = await Promise.all([
        prisma.wedding.findUniqueOrThrow({ where: { id: a.weddingId } }),
        getInvitationSettings(a.weddingId),
      ]);
      const links = await buildInvitationLinks(created, wedding, settings);
      await log(a, "guest.create", `Agregó ${created.length} ${created.length === 1 ? "invitado" : "invitados"}`);
      return json({
        created: created.map((g) => describeGuest(g, labels, links.find((l) => l.guestId === g.id)?.url)),
      });
    }
  );

  server.registerTool(
    "update_guest",
    {
      title: "Editar invitado",
      description: "Cambia datos de un invitado. Para etiquetas usa addLabels / removeLabels (por nombre).",
      inputSchema: z.object({
        guestId: objectId,
        fullName: z.string().max(120).optional(),
        side: sideSchema.optional(),
        phone: z.string().max(30).optional(),
        plusOnes: z.number().int().min(0).max(20).optional(),
        plusOneNames: z.array(z.string()).optional(),
        group: z.string().max(60).optional(),
        notes: z.string().max(500).optional(),
        dietaryRestrictions: z.string().max(300).optional(),
        rsvpStatus: z.enum(["pending", "confirmed", "declined"]).optional(),
        attendingCount: z.number().int().min(0).max(50).nullable().optional().describe("Personas que asisten (incluido el invitado)"),
        addLabels: z.array(z.string()).optional(),
        removeLabels: z.array(z.string()).optional(),
      }),
    },
    async (args, ctx) => {
      const a = editor(ctx);
      const guest = await prisma.guest.findFirst({ where: { id: args.guestId, weddingId: a.weddingId } });
      if (!guest) return json({ error: "Invitado no encontrado." });
      const labels = await weddingLabels(a.weddingId);
      const add = await resolveLabels(a.weddingId, args.addLabels ?? [], labels);
      const remove = new Set(
        (args.removeLabels ?? []).map((n) => labels.find((l) => nameKey(l.name) === nameKey(n))?.id).filter(Boolean)
      );
      const updated = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          ...(args.fullName !== undefined ? { fullName: cleanName(args.fullName) } : {}),
          ...(args.side !== undefined ? { side: parseSide(args.side === "none" ? "" : args.side) } : {}),
          ...(args.phone !== undefined ? { phone: args.phone.trim() } : {}),
          ...(args.plusOnes !== undefined ? { plusOnes: args.plusOnes } : {}),
          ...(args.plusOneNames !== undefined ? { plusOneNames: args.plusOneNames } : {}),
          ...(args.group !== undefined ? { group: args.group } : {}),
          ...(args.notes !== undefined ? { notes: args.notes } : {}),
          ...(args.dietaryRestrictions !== undefined ? { dietaryRestrictions: args.dietaryRestrictions } : {}),
          ...(args.rsvpStatus !== undefined ? { rsvpStatus: args.rsvpStatus } : {}),
          ...(args.attendingCount !== undefined ? { attendingCount: args.attendingCount } : {}),
          labelIds: [...new Set([...guest.labelIds, ...add])].filter((id) => !remove.has(id)),
        },
      });
      await log(a, "guest.update", `Editó al invitado "${updated.fullName}"`, updated.id);
      return json({ updated: describeGuest(updated, labels) });
    }
  );

  server.registerTool(
    "list_labels",
    {
      title: "Listar etiquetas",
      description: "Etiquetas de invitados de la boda, con cuántos invitados tiene cada una.",
      annotations: { readOnlyHint: true },
    },
    async (ctx) => {
      const a = auth(ctx);
      const [labels, guests] = await Promise.all([
        weddingLabels(a.weddingId),
        prisma.guest.findMany({ where: { weddingId: a.weddingId }, select: { labelIds: true } }),
      ]);
      return json(labels.map((l) => ({ name: l.name, color: l.color, guests: guests.filter((g) => g.labelIds.includes(l.id)).length })));
    }
  );

  server.registerTool(
    "get_invitation_links",
    {
      title: "Enlaces de invitación y WhatsApp",
      description:
        "Genera el enlace personal de invitación de cada invitado, el mensaje listo y un enlace de WhatsApp (wa.me) que abre el chat con el mensaje. Pasa guestIds o filtros. El envío lo hace la persona al abrir el enlace; luego usa mark_invitations_sent.",
      inputSchema: z.object({
        guestIds: z.array(z.string()).optional(),
        side: sideSchema.optional(),
        label: z.string().optional(),
        onlyNotSent: z.boolean().optional().describe("Solo invitaciones todavía sin enviar"),
      }),
    },
    async (args, ctx) => {
      const a = editor(ctx);
      const [guests, labels, wedding, settings] = await Promise.all([
        prisma.guest.findMany({ where: { weddingId: a.weddingId }, orderBy: { fullName: "asc" } }),
        weddingLabels(a.weddingId),
        prisma.wedding.findUniqueOrThrow({ where: { id: a.weddingId } }),
        getInvitationSettings(a.weddingId),
      ]);
      const label = args.label ? labels.find((l) => nameKey(l.name) === nameKey(args.label!)) : null;
      const selected = guests
        .filter((g) => !args.guestIds || args.guestIds.includes(g.id))
        .filter((g) => !args.side || g.side === (args.side === "none" ? "" : args.side))
        .filter((g) => !label || g.labelIds.includes(label.id))
        .filter((g) => !args.onlyNotSent || invitationStatus(g) === "not_sent")
        .slice(0, 300);
      const links = await buildInvitationLinks(selected, wedding, settings);
      return json({
        count: links.length,
        invitations: links.map((l) => ({
          guestId: l.guestId,
          fullName: l.fullName,
          invitationUrl: l.url,
          whatsappUrl: l.whatsappUrl,
          phone: l.hasValidPhone ? `+${l.phone}` : null,
          message: l.message,
        })),
      });
    }
  );

  server.registerTool(
    "mark_invitations_sent",
    {
      title: "Marcar invitaciones como enviadas",
      description: "Registra que se envió la invitación a estos invitados (o lo deshace con sent=false).",
      inputSchema: z.object({ guestIds: z.array(z.string()).min(1).max(500), sent: z.boolean().optional() }),
    },
    async ({ guestIds, sent = true }, ctx) => {
      const a = editor(ctx);
      const result = await prisma.guest.updateMany({
        where: { weddingId: a.weddingId, id: { in: guestIds }, ...(sent ? NOT_SENT_FILTER : {}) },
        data: { invitationSentAt: sent ? new Date() : null },
      });
      await log(a, sent ? "invitation.sent" : "invitation.unsent", `${sent ? "Marcó como enviadas" : "Desmarcó"} ${result.count} invitaciones`);
      return json({ updated: result.count });
    }
  );

  server.registerTool(
    "rsvp_responses",
    {
      title: "Respuestas de los invitados",
      description: "Confirmaciones recibidas desde las invitaciones digitales, con el mensaje que dejó cada invitado.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(200).optional() }),
      annotations: { readOnlyHint: true },
    },
    async ({ limit = 50 }, ctx) => {
      const a = auth(ctx);
      const guests = await prisma.guest.findMany({
        where: { weddingId: a.weddingId, rsvpRespondedAt: { not: null } },
        orderBy: { rsvpRespondedAt: "desc" },
        take: limit,
      });
      return json(
        guests.map((g) => ({
          fullName: g.fullName,
          attending: g.rsvpStatus === "confirmed",
          people: g.attendingCount,
          message: g.rsvpMessage || null,
          dietaryRestrictions: g.dietaryRestrictions || null,
          respondedAt: g.rsvpRespondedAt?.toISOString(),
        }))
      );
    }
  );

  server.registerTool(
    "get_invitation_design",
    {
      title: "Ver diseño de la invitación",
      description: "Contenido y estilo actuales de la invitación digital y la plantilla del mensaje de WhatsApp.",
      annotations: { readOnlyHint: true },
    },
    async (ctx) => {
      const a = auth(ctx);
      const s = await getInvitationSettings(a.weddingId);
      return json({
        theme: s.theme,
        availableThemes: Object.fromEntries(Object.entries(INVITATION_THEMES).map(([k, t]) => [k, t.description])),
        headline: s.headline,
        message: s.message,
        quote: s.quote,
        coverImageUrl: s.coverImageUrl,
        family: { brideParents: s.brideParents, groomParents: s.groomParents, sponsors: s.sponsors },
        itinerary: s.itinerary,
        dressCodeColors: s.dressCodeColors,
        gifts: { note: s.giftsNote, bank: s.giftBankName, account: s.giftAccount, holder: s.giftAccountHolder, registryUrl: s.giftRegistryUrl },
        galleryUrls: s.galleryUrls,
        song: { url: s.songUrl, title: s.songTitle },
        adultsOnly: s.adultsOnly,
        recommendations: s.recommendations,
        closingMessage: s.closingMessage,
        ceremony: { time: toEventDateTimeValue(s.ceremonyTime), place: s.ceremonyPlace, address: s.ceremonyAddress, mapUrl: s.ceremonyMapUrl },
        reception: { time: toEventDateTimeValue(s.receptionTime), place: s.receptionPlace, address: s.receptionAddress, mapUrl: s.receptionMapUrl },
        dressCode: s.dressCode,
        dressCodeNote: s.dressCodeNote,
        giftsNote: s.giftsNote,
        hashtag: s.hashtag,
        rsvpDeadline: s.rsvpDeadline?.toISOString().slice(0, 10) ?? null,
        showCountdown: s.showCountdown,
        whatsappTemplate: s.whatsappTemplate || "(predeterminada)",
        defaultCountryCode: s.defaultCountryCode,
      });
    }
  );

  server.registerTool(
    "update_invitation_design",
    {
      title: "Editar la invitación",
      description:
        "Cambia el contenido o el estilo de la invitación digital. Las horas van en formato YYYY-MM-DDTHH:mm (hora de Honduras). La plantilla de WhatsApp admite {nombre}, {nombre_completo}, {pareja}, {fecha}, {enlace} y {lugares}.",
      inputSchema: z.object({
        theme: z.enum(Object.keys(INVITATION_THEMES) as [string, ...string[]]).optional(),
        headline: z.string().max(80).optional(),
        message: z.string().max(1500).optional(),
        quote: z.string().max(400).optional(),
        coverImageUrl: httpUrl.optional(),
        ceremonyTime: z.string().optional(),
        ceremonyPlace: z.string().max(120).optional(),
        ceremonyAddress: z.string().max(200).optional(),
        ceremonyMapUrl: httpUrl.optional(),
        receptionTime: z.string().optional(),
        receptionPlace: z.string().max(120).optional(),
        receptionAddress: z.string().max(200).optional(),
        receptionMapUrl: httpUrl.optional(),
        dressCode: z.string().max(80).optional(),
        dressCodeNote: z.string().max(200).optional(),
        giftsNote: z.string().max(800).optional(),
        hashtag: z.string().max(60).optional(),
        rsvpDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
        showCountdown: z.boolean().optional(),
        whatsappTemplate: z.string().max(2000).optional(),
        brideParents: z.string().max(300).optional().describe("Un nombre por línea"),
        groomParents: z.string().max(300).optional().describe("Un nombre por línea"),
        sponsors: z.string().max(800).optional().describe("Uno por línea: «Rol: Nombres»"),
        itinerary: z
          .array(
            z.object({
              time: z.string().max(20),
              title: z.string().min(1).max(80),
              icon: z.enum(Object.keys(ITINERARY_ICONS) as [string, ...string[]]),
            })
          )
          .max(15)
          .optional()
          .describe("Programa del día, en orden"),
        dressCodeColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(6).optional(),
        giftBankName: z.string().max(80).optional(),
        giftAccount: z.string().max(60).optional(),
        giftAccountHolder: z.string().max(100).optional(),
        giftRegistryUrl: httpUrl.optional(),
        galleryUrls: z.array(httpUrl).max(8).optional(),
        songUrl: httpUrl.optional().describe("Archivo de audio público (mp3)"),
        songTitle: z.string().max(100).optional(),
        adultsOnly: z.boolean().optional(),
        recommendations: z.string().max(800).optional(),
        closingMessage: z.string().max(300).optional(),
        defaultCountryCode: z.string().regex(/^\d{1,4}$/).optional().describe("Código de país para teléfonos sin él (Honduras = 504)"),
      }),
    },
    async (args, ctx) => {
      const a = editor(ctx);
      await getInvitationSettings(a.weddingId);
      const { ceremonyTime, receptionTime, rsvpDeadline, theme, galleryUrls, ...rest } = args;
      await prisma.invitationSettings.update({
        where: { id: a.weddingId },
        data: {
          ...rest,
          ...(theme && isInvitationTheme(theme) ? { theme } : {}),
          ...(galleryUrls ? { galleryUrls: galleryUrls.filter(Boolean) } : {}),
          ...(ceremonyTime !== undefined ? { ceremonyTime: parseEventDateTime(ceremonyTime) } : {}),
          ...(receptionTime !== undefined ? { receptionTime: parseEventDateTime(receptionTime) } : {}),
          ...(rsvpDeadline !== undefined ? { rsvpDeadline: rsvpDeadline ? new Date(`${rsvpDeadline}T00:00:00Z`) : null } : {}),
        },
      });
      await log(a, "invitation.design_update", "Actualizó el diseño de la invitación");
      return json({ ok: true, updatedFields: Object.keys(args) });
    }
  );

  server.registerTool(
    "update_wedding_details",
    {
      title: "Editar datos de la boda",
      description: "Cambia los nombres de la pareja, la fecha (YYYY-MM-DD), el lugar, la dirección o la moneda (código ISO, ej. HNL, USD).",
      inputSchema: z.object({
        partner1: z.string().max(80).optional(),
        partner2: z.string().max(80).optional(),
        weddingDate: dateOnly.optional(),
        venueName: z.string().max(120).optional(),
        venueAddress: z.string().max(200).optional(),
        currency: z.string().regex(/^[A-Z]{3}$/).optional(),
      }),
    },
    async (args, ctx) => {
      const a = editor(ctx);
      const { weddingDate, ...rest } = args;
      const updated = await prisma.wedding.update({
        where: { id: a.weddingId },
        data: { ...rest, ...(weddingDate !== undefined ? { weddingDate: parseDateOnly(weddingDate) } : {}) },
      });
      // El nombre de la organización (boda) sigue a los nombres de la pareja.
      const name = weddingDisplayName(updated);
      await mongoDb.collection("organization").updateOne({ _id: toObjectId(a.weddingId) }, { $set: { name } });
      await log(a, "wedding.update", `Actualizó los datos de la boda ${name}`, a.weddingId);
      return json({
        couple: name,
        weddingDate: toDateOnlyValue(updated.weddingDate) || null,
        venueName: updated.venueName,
        venueAddress: updated.venueAddress,
        currency: updated.currency,
      });
    }
  );

  server.registerTool(
    "delete_guests",
    {
      title: "Eliminar invitados",
      description: "Elimina invitados por id. No se puede deshacer: confirma con la persona antes de usarla.",
      inputSchema: z.object({ guestIds: z.array(objectId).min(1).max(500) }),
      annotations: { destructiveHint: true },
    },
    async ({ guestIds }, ctx) => {
      const a = editor(ctx);
      const guests = await prisma.guest.findMany({ where: { weddingId: a.weddingId, id: { in: guestIds } }, select: { id: true, fullName: true } });
      const result = await prisma.guest.deleteMany({ where: { weddingId: a.weddingId, id: { in: guests.map((g) => g.id) } } });
      await log(
        a,
        "guest.delete",
        result.count === 1 ? `Eliminó al invitado "${guests[0].fullName}"` : `Eliminó ${result.count} invitados`,
        result.count === 1 ? guests[0].id : undefined
      );
      return json({ deleted: guests.map((g) => g.fullName), notFound: guestIds.filter((id) => !guests.some((g) => g.id === id)) });
    }
  );

  server.registerTool(
    "bulk_update_guests",
    {
      title: "Editar varios invitados",
      description: "Aplica el mismo cambio a varios invitados: lado, confirmación, grupo, agregar o quitar etiquetas (por nombre).",
      inputSchema: z.object({
        guestIds: z.array(objectId).min(1).max(1000),
        side: sideSchema.optional(),
        rsvpStatus: z.enum(["pending", "confirmed", "declined"]).optional(),
        group: z.string().max(60).optional(),
        addLabels: z.array(z.string()).optional(),
        removeLabels: z.array(z.string()).optional(),
      }),
    },
    async (args, ctx) => {
      const a = editor(ctx);
      const guests = await prisma.guest.findMany({ where: { weddingId: a.weddingId, id: { in: args.guestIds } } });
      if (guests.length === 0) return json({ error: "Ningún invitado encontrado." });
      const labels = await weddingLabels(a.weddingId);
      const add = await resolveLabels(a.weddingId, args.addLabels ?? [], labels);
      const remove = new Set(
        (args.removeLabels ?? []).map((n) => labels.find((l) => nameKey(l.name) === nameKey(n))?.id).filter(Boolean)
      );
      const ids = guests.map((g) => g.id);
      const simple = {
        ...(args.side !== undefined ? { side: parseSide(args.side === "none" ? "" : args.side) } : {}),
        ...(args.rsvpStatus !== undefined ? { rsvpStatus: args.rsvpStatus } : {}),
        ...(args.group !== undefined ? { group: args.group } : {}),
      };
      if (Object.keys(simple).length > 0) {
        await prisma.guest.updateMany({ where: { weddingId: a.weddingId, id: { in: ids } }, data: simple });
      }
      if (add.length > 0 || remove.size > 0) {
        await Promise.all(
          guests.map((g) =>
            prisma.guest.update({
              where: { id: g.id },
              data: { labelIds: [...new Set([...g.labelIds, ...add])].filter((id) => !remove.has(id)) },
            })
          )
        );
      }
      await log(a, "guest.bulk_update", `Editó ${guests.length} invitados a la vez`);
      return json({ updated: guests.length });
    }
  );

  server.registerTool(
    "create_label",
    {
      title: "Crear etiqueta",
      description: `Crea una etiqueta de invitados (si ya existe una con el mismo nombre, la devuelve). Colores: ${Object.keys(LABEL_COLORS).join(", ")}.`,
      inputSchema: z.object({ name: z.string().min(1).max(CATALOG_NAME_MAX), color: z.enum(Object.keys(LABEL_COLORS) as [string, ...string[]]).optional() }),
    },
    async ({ name, color }, ctx) => {
      const a = editor(ctx);
      const labels = await weddingLabels(a.weddingId);
      const existing = labels.find((l) => nameKey(l.name) === nameKey(name));
      if (existing) return json({ created: false, label: { id: existing.id, name: existing.name, color: existing.color } });
      const palette = Object.keys(LABEL_COLORS);
      const label = await prisma.guestLabel.create({
        data: { weddingId: a.weddingId, name: cleanName(name), color: isLabelColor(color) ? color : palette[labels.length % palette.length] },
      });
      await log(a, "guest_label.create", `Creó la etiqueta "${label.name}"`, label.id);
      return json({ created: true, label: { id: label.id, name: label.name, color: label.color } });
    }
  );

  server.registerTool(
    "update_label",
    {
      title: "Editar etiqueta",
      description: "Renombra una etiqueta o cambia su color. Se identifica por su nombre actual.",
      inputSchema: z.object({
        label: z.string().describe("Nombre actual"),
        newName: z.string().min(1).max(CATALOG_NAME_MAX).optional(),
        color: z.enum(Object.keys(LABEL_COLORS) as [string, ...string[]]).optional(),
      }),
    },
    async (args, ctx) => {
      const a = editor(ctx);
      const labels = await weddingLabels(a.weddingId);
      const label = labels.find((l) => nameKey(l.name) === nameKey(args.label));
      if (!label) return json({ error: `No existe la etiqueta "${args.label}".`, labels: labels.map((l) => l.name) });
      const newName = args.newName ? cleanName(args.newName) : label.name;
      const clash = labels.find((l) => l.id !== label.id && nameKey(l.name) === nameKey(newName));
      if (clash) return json({ error: `Ya existe la etiqueta "${clash.name}".` });
      const updated = await prisma.guestLabel.update({
        where: { id: label.id },
        data: { name: newName, ...(isLabelColor(args.color) ? { color: args.color } : {}) },
      });
      await log(a, "guest_label.update", `Editó la etiqueta "${updated.name}"`, updated.id);
      return json({ label: { id: updated.id, name: updated.name, color: updated.color } });
    }
  );

  server.registerTool(
    "delete_label",
    {
      title: "Eliminar etiqueta",
      description: "Elimina una etiqueta (por nombre) y la quita de los invitados que la tenían.",
      inputSchema: z.object({ label: z.string() }),
      annotations: { destructiveHint: true },
    },
    async (args, ctx) => {
      const a = editor(ctx);
      const labels = await weddingLabels(a.weddingId);
      const label = labels.find((l) => nameKey(l.name) === nameKey(args.label));
      if (!label) return json({ error: `No existe la etiqueta "${args.label}".`, labels: labels.map((l) => l.name) });
      await prisma.guestLabel.delete({ where: { id: label.id } });
      const guests = await prisma.guest.findMany({ where: { weddingId: a.weddingId, labelIds: { has: label.id } }, select: { id: true, labelIds: true } });
      await Promise.all(
        guests.map((g) => prisma.guest.update({ where: { id: g.id }, data: { labelIds: g.labelIds.filter((l) => l !== label.id) } }))
      );
      await log(a, "guest_label.delete", `Eliminó la etiqueta "${label.name}"`, label.id);
      return json({ deleted: label.name, removedFromGuests: guests.length });
    }
  );

  server.registerTool(
    "list_guest_groups",
    {
      title: "Listar grupos de invitados",
      description: "Grupos de invitados del catálogo (ej. «Familia del novio»), con cuántos invitados tiene cada uno. El grupo de un invitado es texto libre; el catálogo solo sugiere nombres.",
      annotations: { readOnlyHint: true },
    },
    async (ctx) => {
      const a = auth(ctx);
      const [groups, guests] = await Promise.all([
        prisma.guestGroup.findMany({ where: { weddingId: a.weddingId }, orderBy: { name: "asc" } }),
        prisma.guest.findMany({ where: { weddingId: a.weddingId }, select: { group: true } }),
      ]);
      return json(groups.map((g) => ({ id: g.id, name: g.name, guests: guests.filter((x) => nameKey(x.group) === nameKey(g.name)).length })));
    }
  );

  server.registerTool(
    "manage_guest_group",
    {
      title: "Crear, renombrar o eliminar un grupo",
      description: "action=create (name), rename (groupId, name) o delete (groupId). Renombrar también actualiza a los invitados que tenían el nombre anterior.",
      inputSchema: z.object({
        action: z.enum(["create", "rename", "delete"]),
        groupId: objectId.optional(),
        name: z.string().max(CATALOG_NAME_MAX).optional(),
      }),
    },
    async ({ action, groupId, name }, ctx) => {
      const a = editor(ctx);
      if (action === "create") {
        const check = await checkCatalogName("group", a.weddingId, name);
        if (!check.ok) return json(check.existing ? { created: false, group: check.existing } : { error: check.error });
        const group = await prisma.guestGroup.create({ data: { weddingId: a.weddingId, name: check.name } });
        await log(a, "guest_group.create", `Creó el grupo "${group.name}"`, group.id);
        return json({ created: true, group: { id: group.id, name: group.name } });
      }
      const group = groupId ? await prisma.guestGroup.findFirst({ where: { id: groupId, weddingId: a.weddingId } }) : null;
      if (!group) return json({ error: "Grupo no encontrado." });
      if (action === "rename") {
        const check = await checkCatalogName("group", a.weddingId, name, group.id);
        if (!check.ok) return json({ error: check.error });
        await prisma.guestGroup.update({ where: { id: group.id }, data: { name: check.name } });
        const moved = await prisma.guest.updateMany({ where: { weddingId: a.weddingId, group: group.name }, data: { group: check.name } });
        await log(a, "guest_group.update", `Editó el grupo "${check.name}"`, group.id);
        return json({ group: { id: group.id, name: check.name }, guestsUpdated: moved.count });
      }
      await prisma.guestGroup.delete({ where: { id: group.id } });
      await log(a, "guest_group.delete", `Eliminó el grupo "${group.name}"`, group.id);
      return json({ deleted: group.name });
    }
  );
}
