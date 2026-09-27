import { PageHeader } from "@/app/(admin)/admin/_components/ui";
import { SessionsTable } from "@/app/(admin)/admin/sesiones/SessionsTable";
import { getActiveSessions } from "@/lib/admin-data";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const [sessions, current] = await Promise.all([getActiveSessions(), getSession()]);
  const people = new Set(sessions.map((s) => s.userId)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sesiones activas"
        description={`${sessions.length} sesiones abiertas de ${people} ${people === 1 ? "persona" : "personas"}. Cerrar una obliga a volver a iniciar sesión en ese dispositivo.`}
      />
      <SessionsTable sessions={sessions} currentToken={current?.session.token ?? ""} />
    </div>
  );
}
