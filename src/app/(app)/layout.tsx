import { Eye } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getWeddingContext, listUserWeddings } from "@/lib/wedding";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireSession();
  const [ctx, weddings] = await Promise.all([getWeddingContext(), listUserWeddings(user.id)]);
  const wedding = ctx ? await prisma.wedding.findUnique({ where: { id: ctx.weddingId } }) : null;
  const canEdit = ctx?.canEdit ?? false;

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email, isAdmin: user.role === "admin" }}
        weddings={weddings}
        activeWeddingId={ctx?.weddingId ?? null}
        wedding={wedding}
        canEdit={canEdit}
      />
      <SidebarInset>
        <SiteHeader wedding={wedding} canEdit={canEdit} />
        {ctx && !ctx.canEdit && (
          <div className="flex items-center justify-center gap-2 border-b border-border bg-accent px-4 py-2 text-sm text-accent-foreground">
            <Eye className="size-4" />
            Tu rol en esta boda es {roleLabel(ctx.role).toLowerCase()}: puedes ver todo, pero no hacer cambios.
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
