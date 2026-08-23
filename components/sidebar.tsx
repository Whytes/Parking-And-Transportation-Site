import Link from "next/link";

import { SidebarNav } from "@/components/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { type Role } from "@/lib/permissions";

export function Sidebar({ role, name }: { role: Role; name?: string | null }) {
  return (
    <aside className="sidebar">
      <h1>ParkAndTran</h1>
      <p className="muted" style={{ color: "rgba(244, 247, 251, 0.72)" }}>
        {name ?? "User"} · {role === "admin" ? "Admin" : "Officer"}
      </p>
      <div className="sidebar-brand-rule" />
      <SidebarNav role={role} />
      <nav>
        <SignOutButton />
      </nav>
    </aside>
  );
}
