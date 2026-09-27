import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { isBuildPhase, mongoClient, mongoDb } from "@/lib/mongo";

export const auth = betterAuth({
  appName: "WeddingPlanner",
  // BETTER_AUTH_SECRET y BETTER_AUTH_URL vienen del entorno; en `next build` no existen.
  secret: process.env.BETTER_AUTH_SECRET ?? (isBuildPhase ? "build-phase-placeholder-secret-not-used" : undefined),
  database: mongodbAdapter(mongoDb, { client: mongoClient }),
  emailAndPassword: {
    enabled: true,
    // Sin registro público: las cuentas las crea un administrador desde /admin.
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      // Boda a la que pertenece el usuario. Varios usuarios pueden compartir la misma
      // boda (pareja, wedding planner). `input: false` impide que el usuario la cambie.
      weddingId: { type: "string", required: false, input: false },
    },
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
    },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
  },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] }), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
