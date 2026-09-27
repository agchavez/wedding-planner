import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, organization } from "better-auth/plugins";
import { clientIp, recordAudit } from "@/lib/audit-log";
import { idMatch, idString, toObjectId } from "@/lib/ids";
import { isBuildPhase, mongoClient, mongoDb } from "@/lib/mongo";
import { ac, weddingRoles } from "@/lib/permissions";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
export const isGoogleEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  appName: "Wedplan",
  // BETTER_AUTH_SECRET y BETTER_AUTH_URL vienen del entorno; en `next build` no existen.
  secret: process.env.BETTER_AUTH_SECRET ?? (isBuildPhase ? "build-phase-placeholder-secret-not-used" : undefined),
  database: mongodbAdapter(mongoDb, { client: mongoClient }),
  emailAndPassword: {
    enabled: true,
    // Registro abierto en /registro; también se crean cuentas al aceptar una invitación
    // (ver app/invitacion) o desde la consola de administración.
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  // Con Google cualquiera puede crear su cuenta (Google ya verificó el correo); al entrar
  // crea su boda o acepta una invitación. Si el correo ya tenía cuenta, se vincula.
  socialProviders: isGoogleEnabled
    ? { google: { clientId: googleClientId!, clientSecret: googleClientSecret!, prompt: "select_account" } }
    : {},
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
    },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user, ctx) => {
          // Cuentas creadas por el propio usuario (formulario o Google); las del admin y las
          // de invitaciones ya se registran en su propia acción.
          const path = ctx?.path ?? "";
          if (!path.startsWith("/sign-up") && !path.startsWith("/callback")) return;
          const h = ctx?.request?.headers ?? ctx?.headers;
          await recordAudit({
            action: "auth.sign_up",
            category: "auth",
            summary: path.startsWith("/callback") ? "Creó su cuenta con Google" : "Creó su cuenta",
            actor: { id: user.id, name: user.name, email: user.email },
            ip: h ? clientIp(h) : "",
            userAgent: h?.get("user-agent") ?? "",
          });
        },
      },
    },
    session: {
      create: {
        // Al iniciar sesión, la boda activa es la primera de la que el usuario forma parte.
        before: async (session) => {
          const member = await mongoDb
            .collection("member")
            .findOne({ userId: idMatch(session.userId) }, { sort: { createdAt: 1 } });
          return { data: { ...session, activeOrganizationId: member ? idString(member.organizationId) : null } };
        },
        after: async (session) => {
          const user = await mongoDb.collection("user").findOne({ _id: toObjectId(session.userId) });
          await recordAudit({
            action: "auth.sign_in",
            category: "auth",
            summary: "Inició sesión",
            actor: user ? { id: session.userId, name: user.name, email: user.email } : null,
            ip: session.ipAddress,
            userAgent: session.userAgent,
          });
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email" || !(ctx.context.returned instanceof APIError)) return;
      const email = String((ctx.body as { email?: string } | undefined)?.email ?? "").toLowerCase();
      const h = ctx.request?.headers ?? ctx.headers;
      await recordAudit({
        action: "auth.sign_in_failed",
        category: "auth",
        success: false,
        summary: `Intento fallido de inicio de sesión para ${email || "un correo vacío"}`,
        actor: { id: "", name: "", email },
        ip: h ? clientIp(h) : "",
        userAgent: h?.get("user-agent") ?? "",
      });
    }),
  },
  plugins: [
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    // Cada boda es una organización: miembros con rol, invitaciones y boda activa en la sesión.
    organization({
      ac,
      roles: weddingRoles,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7,
      cancelPendingInvitationsOnReInvite: true,
      // No hay proveedor de correo: el enlace de la invitación se copia y se comparte a mano.
      sendInvitationEmail: async () => {},
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
