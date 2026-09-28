import "server-only";
import { ObjectId, type Document } from "mongodb";
import { mongoDb } from "@/lib/mongo";
import { prisma } from "@/lib/prisma";
import { idString } from "@/lib/ids";
import { parseWeddingRole, type WeddingRole } from "@/lib/permissions";
import { weddingDisplayName } from "@/lib/wedding";

const DAY = 24 * 60 * 60 * 1000;
export const APP_TIMEZONE = process.env.TZ || "America/Tegucigalpa";
const audit = () => mongoDb.collection("AuditLog");

export type HealthLevel = "good" | "warning" | "critical";
export type HealthCheck = { label: string; value: string; detail: string; level: HealthLevel };

// ───────────────────────── Salud del sistema ─────────────────────────

export async function getSystemHealth(): Promise<HealthCheck[]> {
  const started = performance.now();
  let dbLevel: HealthLevel = "good";
  let dbValue = "";
  try {
    await mongoDb.command({ ping: 1 });
    const ms = Math.round(performance.now() - started);
    dbValue = `${ms} ms`;
    dbLevel = ms < 250 ? "good" : ms < 1000 ? "warning" : "critical";
  } catch {
    dbValue = "Sin conexión";
    dbLevel = "critical";
  }

  const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const uptime = process.uptime();
  const version = process.env.APP_VERSION?.slice(0, 7) || "local";

  return [
    { label: "Base de datos", value: dbValue, detail: "Latencia de MongoDB Atlas", level: dbLevel },
    {
      label: "Memoria",
      value: `${rssMb} MB`,
      detail: "Uso del proceso de la app",
      level: rssMb < 600 ? "good" : rssMb < 900 ? "warning" : "critical",
    },
    { label: "En línea", value: formatDuration(uptime), detail: `Versión ${version} · Node ${process.version}`, level: "good" },
  ];
}

function formatDuration(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

// ───────────────────────── Resumen ─────────────────────────

export type DailyPoint = { date: string; count: number };

export async function getOverview() {
  const now = new Date();
  const since24h = new Date(now.getTime() - DAY);
  const since7d = new Date(now.getTime() - 7 * DAY);
  const since14d = new Date(now.getTime() - 14 * DAY);

  const [
    totalUsers,
    newUsers7d,
    bannedUsers,
    totalWeddings,
    activeWeddingIds,
    activeSessions,
    signIns24h,
    failed24h,
    daily,
    failedByIp,
  ] = await Promise.all([
    mongoDb.collection("user").countDocuments(),
    mongoDb.collection("user").countDocuments({ createdAt: { $gte: since7d } }),
    mongoDb.collection("user").countDocuments({ banned: true }),
    prisma.wedding.count(),
    audit().distinct("weddingId", { category: "data", createdAt: { $gte: since7d }, weddingId: { $ne: null } }),
    mongoDb.collection("session").countDocuments({ expiresAt: { $gt: now } }),
    audit().countDocuments({ action: "auth.sign_in", createdAt: { $gte: since24h } }),
    audit().countDocuments({ action: "auth.sign_in_failed", createdAt: { $gte: since24h } }),
    audit()
      .aggregate<{ _id: string; count: number }>([
        { $match: { category: "data", createdAt: { $gte: since14d } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: APP_TIMEZONE } }, count: { $sum: 1 } } },
      ])
      .toArray(),
    audit()
      .aggregate<{ _id: string; count: number; emails: string[]; last: Date }>([
        { $match: { action: "auth.sign_in_failed", createdAt: { $gte: since24h } } },
        { $group: { _id: "$ip", count: { $sum: 1 }, emails: { $addToSet: "$actorEmail" }, last: { $max: "$createdAt" } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
  ]);

  // Serie continua de 14 días (los días sin actividad cuentan como 0).
  const byDay = new Map(daily.map((d) => [d._id, d.count]));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE });
  const series: DailyPoint[] = Array.from({ length: 14 }, (_, i) => {
    const date = fmt.format(new Date(now.getTime() - (13 - i) * DAY));
    return { date, count: byDay.get(date) ?? 0 };
  });

  return {
    totalUsers,
    newUsers7d,
    bannedUsers,
    totalWeddings,
    activeWeddings7d: activeWeddingIds.length,
    activeSessions,
    signIns24h,
    failed24h,
    series,
    failedByIp: failedByIp.map((f) => ({
      ip: f._id || "desconocida",
      count: f.count,
      emails: f.emails.filter(Boolean),
      last: f.last.toISOString(),
    })),
  };
}

// ───────────────────────── Auditoría ─────────────────────────

export type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  category: string;
  summary: string;
  success: boolean;
  actorName: string;
  actorEmail: string;
  weddingId: string | null;
  weddingName: string | null;
  ip: string;
  userAgent: string;
};

export type AuditFilters = {
  category?: string;
  result?: string;
  q?: string;
  weddingId?: string;
  actorId?: string;
  page?: number;
  pageSize?: number;
};

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getAuditPage(filters: AuditFilters) {
  const pageSize = filters.pageSize ?? 40;
  const page = Math.max(1, filters.page ?? 1);
  const query: Document = {};
  if (filters.category && ["auth", "data", "admin"].includes(filters.category)) query.category = filters.category;
  if (filters.result === "failed") query.success = false;
  if (filters.weddingId) query.weddingId = filters.weddingId;
  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.q?.trim()) {
    const rx = new RegExp(escapeRegex(filters.q.trim()), "i");
    query.$or = [{ summary: rx }, { actorEmail: rx }, { actorName: rx }, { ip: rx }];
  }

  const [total, docs] = await Promise.all([
    audit().countDocuments(query),
    audit()
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  return { total, page, pageSize, rows: await toAuditRows(docs) };
}

export async function getRecentActivity(limit: number, filter: Document = {}) {
  const docs = await audit().find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
  return toAuditRows(docs);
}

async function toAuditRows(docs: Document[]): Promise<AuditRow[]> {
  const weddingIds = [...new Set(docs.map((d) => d.weddingId).filter(Boolean))] as string[];
  const weddings = await prisma.wedding.findMany({ where: { id: { in: weddingIds } } });
  const names = new Map(weddings.map((w) => [w.id, weddingDisplayName(w)]));
  return docs.map((d) => ({
    id: idString(d._id),
    createdAt: new Date(d.createdAt).toISOString(),
    action: d.action,
    category: d.category,
    summary: d.summary,
    success: d.success !== false,
    actorName: d.actorName ?? "",
    actorEmail: d.actorEmail ?? "",
    weddingId: d.weddingId ?? null,
    weddingName: d.weddingId ? (names.get(d.weddingId) ?? "Boda eliminada") : null,
    ip: d.ip ?? "",
    userAgent: d.userAgent ?? "",
  }));
}

// ───────────────────────── Usuarios ─────────────────────────

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  banned: boolean;
  createdAt: string;
  lastSeen: string | null;
  activeSessions: number;
  weddings: { id: string; name: string; role: WeddingRole }[];
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const now = new Date();
  const [users, members, weddings, sessionStats, signIns] = await Promise.all([
    mongoDb.collection("user").find().sort({ createdAt: -1 }).toArray(),
    mongoDb.collection("member").find().toArray(),
    prisma.wedding.findMany(),
    mongoDb
      .collection("session")
      .aggregate<{ _id: unknown; lastSeen: Date; active: number }>([
        {
          $group: {
            _id: "$userId",
            lastSeen: { $max: "$updatedAt" },
            active: { $sum: { $cond: [{ $gt: ["$expiresAt", now] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    // Las sesiones se borran al cerrar sesión; el registro de accesos conserva el último.
    audit()
      .aggregate<{ _id: string; last: Date }>([
        { $match: { action: "auth.sign_in" } },
        { $group: { _id: "$actorId", last: { $max: "$createdAt" } } },
      ])
      .toArray(),
  ]);

  const weddingNames = new Map(weddings.map((w) => [w.id, weddingDisplayName(w)]));
  const stats = new Map(sessionStats.map((s) => [idString(s._id), s]));
  const lastSignIn = new Map(signIns.map((s) => [s._id, s.last]));
  const membershipsByUser = new Map<string, AdminUser["weddings"]>();
  for (const m of members) {
    const userId = idString(m.userId);
    const weddingId = idString(m.organizationId);
    const list = membershipsByUser.get(userId) ?? [];
    list.push({ id: weddingId, name: weddingNames.get(weddingId) ?? "Boda sin nombre", role: parseWeddingRole(m.role) });
    membershipsByUser.set(userId, list);
  }

  return users.map((u) => {
    const id = idString(u._id);
    const s = stats.get(id);
    const seen = [s?.lastSeen, lastSignIn.get(id)].filter(Boolean).map((d) => new Date(d!).getTime());
    return {
      id,
      name: u.name,
      email: u.email,
      role: u.role === "admin" ? "admin" : "user",
      banned: Boolean(u.banned),
      createdAt: new Date(u.createdAt).toISOString(),
      lastSeen: seen.length ? new Date(Math.max(...seen)).toISOString() : null,
      activeSessions: s?.active ?? 0,
      weddings: membershipsByUser.get(id) ?? [],
    };
  });
}

// ───────────────────────── Bodas ─────────────────────────

export type AdminWedding = {
  id: string;
  name: string;
  weddingDate: string | null;
  venueName: string;
  createdAt: string;
  members: { userId: string; name: string; email: string; role: WeddingRole }[];
  guests: number;
  confirmedGuests: number;
  spent: number;
  totalBudget: number;
  currency: string;
  songs: number;
  pendingInvites: number;
  lastActivity: string | null;
};

export async function getAdminWeddings(onlyId?: string): Promise<AdminWedding[]> {
  const where = onlyId ? { id: onlyId } : {};
  const weddingFilter = onlyId ? { weddingId: onlyId } : {};
  const [weddings, members, guestGroups, confirmedGroups, expenseGroups, contributionGroups, songGroups, invites, lastActivity] =
    await Promise.all([
      prisma.wedding.findMany({ where, orderBy: { createdAt: "desc" } }),
      mongoDb.collection("member").find(onlyId ? { organizationId: { $in: [onlyId, new ObjectId(onlyId)] } } : {}).toArray(),
      prisma.guest.groupBy({ by: ["weddingId"], where: weddingFilter, _count: { _all: true } }),
      prisma.guest.groupBy({ by: ["weddingId"], where: { ...weddingFilter, rsvpStatus: "confirmed" }, _count: { _all: true } }),
      prisma.expense.groupBy({ by: ["weddingId"], where: weddingFilter, _sum: { actualAmount: true } }),
      // El presupuesto total de una boda es la suma de sus aportes.
      prisma.budgetContribution.groupBy({ by: ["weddingId"], where: weddingFilter, _sum: { amount: true } }),
      prisma.song.groupBy({ by: ["weddingId"], where: weddingFilter, _count: { _all: true } }),
      mongoDb
        .collection("invitation")
        .aggregate<{ _id: unknown; count: number }>([
          { $match: { status: "pending", expiresAt: { $gt: new Date() } } },
          { $group: { _id: "$organizationId", count: { $sum: 1 } } },
        ])
        .toArray(),
      audit()
        .aggregate<{ _id: string; last: Date }>([
          { $match: { category: "data", weddingId: onlyId ?? { $ne: null } } },
          { $group: { _id: "$weddingId", last: { $max: "$createdAt" } } },
        ])
        .toArray(),
    ]);

  const userIds = [...new Set(members.map((m) => idString(m.userId)))].filter((id) => ObjectId.isValid(id));
  const users = await mongoDb
    .collection("user")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .toArray();
  const userById = new Map(users.map((u) => [idString(u._id), u]));

  const count = (groups: { weddingId: string | null; _count: { _all: number } }[]) =>
    new Map(groups.map((g) => [g.weddingId ?? "", g._count._all]));
  const guests = count(guestGroups);
  const confirmed = count(confirmedGroups);
  const songs = count(songGroups);
  const spent = new Map(expenseGroups.map((g) => [g.weddingId ?? "", g._sum.actualAmount ?? 0]));
  const budget = new Map(contributionGroups.map((g) => [g.weddingId ?? "", g._sum.amount ?? 0]));
  const pending = new Map(invites.map((i) => [idString(i._id), i.count]));
  const last = new Map(lastActivity.map((l) => [l._id, l.last]));

  const membersByWedding = new Map<string, AdminWedding["members"]>();
  for (const m of members) {
    const wid = idString(m.organizationId);
    const u = userById.get(idString(m.userId));
    const list = membersByWedding.get(wid) ?? [];
    list.push({
      userId: idString(m.userId),
      name: u?.name ?? "Usuario eliminado",
      email: u?.email ?? "",
      role: parseWeddingRole(m.role),
    });
    membersByWedding.set(wid, list);
  }
  const roleOrder: WeddingRole[] = ["owner", "admin", "member", "viewer"];

  return weddings.map((w) => ({
    id: w.id,
    name: weddingDisplayName(w),
    weddingDate: w.weddingDate?.toISOString() ?? null,
    venueName: w.venueName,
    createdAt: w.createdAt.toISOString(),
    members: (membersByWedding.get(w.id) ?? []).sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)),
    guests: guests.get(w.id) ?? 0,
    confirmedGuests: confirmed.get(w.id) ?? 0,
    spent: spent.get(w.id) ?? 0,
    totalBudget: budget.get(w.id) ?? 0,
    currency: w.currency,
    songs: songs.get(w.id) ?? 0,
    pendingInvites: pending.get(w.id) ?? 0,
    lastActivity: last.get(w.id)?.toISOString() ?? null,
  }));
}

// ───────────────────────── Sesiones ─────────────────────────

export type AdminSession = {
  id: string;
  token: string;
  userId: string;
  userName: string;
  userEmail: string;
  ip: string;
  device: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export async function getActiveSessions(): Promise<AdminSession[]> {
  const sessions = await mongoDb
    .collection("session")
    .find({ expiresAt: { $gt: new Date() } })
    .sort({ updatedAt: -1 })
    .limit(300)
    .toArray();
  const userIds = [...new Set(sessions.map((s) => idString(s.userId)))].filter((id) => ObjectId.isValid(id));
  const users = await mongoDb
    .collection("user")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .toArray();
  const byId = new Map(users.map((u) => [idString(u._id), u]));

  return sessions.map((s) => {
    const u = byId.get(idString(s.userId));
    return {
      id: idString(s._id),
      token: s.token,
      userId: idString(s.userId),
      userName: u?.name ?? "Usuario eliminado",
      userEmail: u?.email ?? "",
      ip: s.ipAddress ?? "",
      device: describeUserAgent(s.userAgent ?? ""),
      createdAt: new Date(s.createdAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
      expiresAt: new Date(s.expiresAt).toISOString(),
    };
  });
}

/** Resumen legible de un user-agent: "Chrome en macOS". */
export function describeUserAgent(ua: string) {
  if (!ua) return "Desconocido";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /curl|node|undici/i.test(ua)
              ? "Script"
              : "Navegador";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} en ${os}` : browser;
}
