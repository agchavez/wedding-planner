import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit-log";
import { weddingDisplayName } from "@/lib/wedding";
import { cleanName, nameKey } from "@/lib/catalog";
import { LABEL_COLORS, parseSide, SIDE_LABEL } from "@/lib/guestLabels";
import { buildInvitationLinks, getInvitationSettings, NOT_SENT_FILTER } from "@/lib/guestInvitations";
import { INVITATION_STATUS, invitationStatus, type InvitationStatus } from "@/lib/invitationMessage";
import { isInvitationTheme, INVITATION_THEMES } from "@/lib/invitationThemes";
import { parseEventDateTime, toEventDateTimeValue } from "@/lib/eventTime";
import type { McpAuthContext } from "@/lib/mcpTokens";
import type { Guest, GuestLabel } from "@/generated/prisma";

/**
 * Herramientas del servidor MCP (/api/mcp): permiten a un asistente de IA gestionar los
 * invitados y las invitaciones de UNA boda (la del token). Todo queda en la auditoría.
 */

type Ctx = { http?: { authInfo?: { extra?: Record<string, unknown> } } };

function auth(ctx: Ctx): McpAuthContext {
  const value = ctx.http?.authInfo?.extra?.wedding as McpAuthContext | undefined;
  if (!value) throw new Error("No autenticado.");
  return value;
}

function requireEdit(a: McpAuthContext) {
  if (!a.canEdit) throw new Error("Tu rol en esta boda es de solo lectura.");
}

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

async function log(a: McpAuthContext, action: string, summary: string, targetId?: string) {
  await recordAudit({
    action,
    category: "data",
    summary: `${summary} (vía asistente de IA)`,
    actor: { id: a.userId, name: a.userName, email: "" },
    weddingId: a.weddingId,
    targetId: targetId ?? null,
    userAgent: "mcp",
  });
}

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
    ...(url ? { invitationUrl: url } : {}),
  };
}

// Solo http(s): z.string().url() también acepta javascript:, data:, etc.
const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^https?:\/\//i.test(u), "Solo enlaces http(s)")
  .or(z.literal(""));

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
      const a = auth(ctx as Ctx);
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
        weddingDate: wedding.weddingDate?.toISOString().slice(0, 10) ?? null,
        venue: wedding.venueName || null,
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
      const a = auth(ctx as Ctx);
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
      const a = auth(ctx as Ctx);
      requireEdit(a);
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
        guestId: z.string(),
        fullName: z.string().max(120).optional(),
        side: sideSchema.optional(),
        phone: z.string().max(30).optional(),
        plusOnes: z.number().int().min(0).max(20).optional(),
        plusOneNames: z.array(z.string()).optional(),
        group: z.string().max(60).optional(),
        notes: z.string().max(500).optional(),
        rsvpStatus: z.enum(["pending", "confirmed", "declined"]).optional(),
        addLabels: z.array(z.string()).optional(),
        removeLabels: z.array(z.string()).optional(),
      }),
    },
    async (args, ctx) => {
      const a = auth(ctx as Ctx);
      requireEdit(a);
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
          ...(args.rsvpStatus !== undefined ? { rsvpStatus: args.rsvpStatus } : {}),
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
      const a = auth(ctx as Ctx);
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
      const a = auth(ctx as Ctx);
      requireEdit(a);
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
      const a = auth(ctx as Ctx);
      requireEdit(a);
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
      const a = auth(ctx as Ctx);
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
      const a = auth(ctx as Ctx);
      const s = await getInvitationSettings(a.weddingId);
      return json({
        theme: s.theme,
        availableThemes: Object.fromEntries(Object.entries(INVITATION_THEMES).map(([k, t]) => [k, t.description])),
        headline: s.headline,
        message: s.message,
        quote: s.quote,
        coverImageUrl: s.coverImageUrl,
        ceremony: { time: toEventDateTimeValue(s.ceremonyTime), place: s.ceremonyPlace, address: s.ceremonyAddress, mapUrl: s.ceremonyMapUrl },
        reception: { time: toEventDateTimeValue(s.receptionTime), place: s.receptionPlace, address: s.receptionAddress, mapUrl: s.receptionMapUrl },
        dressCode: s.dressCode,
        dressCodeNote: s.dressCodeNote,
        giftsNote: s.giftsNote,
        hashtag: s.hashtag,
        rsvpDeadline: s.rsvpDeadline?.toISOString().slice(0, 10) ?? null,
        showCountdown: s.showCountdown,
        whatsappTemplate: s.whatsappTemplate || "(predeterminada)",
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
      }),
    },
    async (args, ctx) => {
      const a = auth(ctx as Ctx);
      requireEdit(a);
      await getInvitationSettings(a.weddingId);
      const { ceremonyTime, receptionTime, rsvpDeadline, theme, ...rest } = args;
      await prisma.invitationSettings.update({
        where: { id: a.weddingId },
        data: {
          ...rest,
          ...(theme && isInvitationTheme(theme) ? { theme } : {}),
          ...(ceremonyTime !== undefined ? { ceremonyTime: parseEventDateTime(ceremonyTime) } : {}),
          ...(receptionTime !== undefined ? { receptionTime: parseEventDateTime(receptionTime) } : {}),
          ...(rsvpDeadline !== undefined ? { rsvpDeadline: rsvpDeadline ? new Date(`${rsvpDeadline}T00:00:00Z`) : null } : {}),
        },
      });
      await log(a, "invitation.design_update", "Actualizó el diseño de la invitación");
      return json({ ok: true, updatedFields: Object.keys(args) });
    }
  );
}
