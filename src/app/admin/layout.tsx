import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { requirePermission } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin — Nexus Commerce" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // The proxy already blocks non-staff; this re-checks on the server.
  const user = await requirePermission("dashboard:view");
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar role={user.role} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">Admin console</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={{ name: user.name, email: user.email, image: user.image, role: user.role }} />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
