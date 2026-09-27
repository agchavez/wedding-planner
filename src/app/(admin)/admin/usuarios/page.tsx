import { PageHeader } from "@/app/(admin)/admin/_components/ui";
import { UsersTable } from "@/app/(admin)/admin/usuarios/UsersTable";
import { getAdminUsers } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([requireAdmin(), getAdminUsers()]);
  const withoutWedding = users.filter((u) => u.weddings.length === 0 && u.role !== "admin").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description={`${users.length} cuentas${withoutWedding ? ` · ${withoutWedding} todavía sin boda` : ""}. Las bodas las crean los propios usuarios.`}
      />
      <UsersTable users={users} currentUserId={session.user.id} />
    </div>
  );
}
