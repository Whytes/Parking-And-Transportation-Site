import { Sidebar } from "@/components/sidebar";
import { requireAuth } from "@/lib/authz";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAuth();

  return (
    <div className="app-shell">
      <Sidebar role={session.user.role} name={session.user.name} />
      <main>{children}</main>
    </div>
  );
}
