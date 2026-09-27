import type { Metadata } from "next";
import { AdminSidebar } from "@/app/(admin)/admin/_components/AdminSidebar";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Consola · Wedplan" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdmin();

  return (
    <SidebarProvider>
      <AdminSidebar user={{ name: user.name, email: user.email, isAdmin: true }} />
      <SidebarInset>
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
