import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, memberAc, ownerAc } from "better-auth/plugins/organization/access";

/**
 * Permisos dentro de una boda (cada boda es una "organización" de Better Auth).
 * `wedding.edit` cubre los datos de la boda: invitados, presupuesto, canciones, etc.
 */
const statements = { ...defaultStatements, wedding: ["edit"] } as const;

export const ac = createAccessControl(statements);

export const weddingRoles = {
  owner: ac.newRole({ ...ownerAc.statements, wedding: ["edit"] }),
  admin: ac.newRole({ ...adminAc.statements, wedding: ["edit"] }),
  member: ac.newRole({ ...memberAc.statements, wedding: ["edit"] }),
  viewer: ac.newRole({}),
};

export type WeddingRole = keyof typeof weddingRoles;

export const WEDDING_ROLES: { value: WeddingRole; label: string; description: string }[] = [
  { value: "owner", label: "Pareja", description: "Control total: datos, participantes y la boda misma." },
  { value: "admin", label: "Organizador", description: "Edita todo e invita o quita participantes." },
  { value: "member", label: "Colaborador", description: "Edita invitados, presupuesto, música y horarios." },
  { value: "viewer", label: "Solo lectura", description: "Puede ver la boda, pero no cambiar nada." },
];

export function roleLabel(role: string | null | undefined) {
  const primary = role?.split(",")[0]?.trim();
  return WEDDING_ROLES.find((r) => r.value === primary)?.label ?? "Participante";
}

export function parseWeddingRole(role: string | null | undefined): WeddingRole {
  const primary = role?.split(",")[0]?.trim();
  return (WEDDING_ROLES.find((r) => r.value === primary)?.value ?? "viewer") as WeddingRole;
}

export function canEditWedding(role: WeddingRole) {
  return role !== "viewer";
}

export function canManageMembers(role: WeddingRole) {
  return role === "owner" || role === "admin";
}
