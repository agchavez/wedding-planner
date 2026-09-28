import { Eye } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SiteHeader } from "@/components/SiteHeader";
import { WeddingAccessProvider } from "@/components/WeddingAccess";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { roleLabel } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getWeddingContext, listUserWeddings } from "@/lib/wedding";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireSession();
  const [ctx, weddings] = await Promise.all([getWeddingContext(), listUserWeddings(user.id)]);

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email, isAdmin: user.role === "admin" }}
        weddings={weddings}
        activeWeddingId={ctx?.weddingId ?? null}
      />
      <SidebarInset>
        <SiteHeader />
        {ctx && !ctx.canEdit && (
          <div className="flex items-center justify-center gap-2 border-b border-border bg-accent px-4 py-2 text-sm text-accent-foreground">
            <Eye className="size-4" />
            Tu rol en esta boda es {roleLabel(ctx.role).toLowerCase()}: puedes ver todo, pero no hacer cambios.
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <WeddingAccessProvider value={{ canEdit: ctx?.canEdit ?? true, canManage: ctx?.canManage ?? true }}>
            {children}
          </WeddingAccessProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
