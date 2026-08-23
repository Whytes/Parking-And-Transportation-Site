import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { can } from "@/lib/authz";
import { type Role } from "@/lib/permissions";

const links = [
  { href: "/citations", label: "Citations", permission: "citations" },
  { href: "/statistics", label: "Statistics", permission: "statistics" },
  { href: "/officers", label: "Officers", permission: "officers" },
  { href: "/import", label: "Import", permission: "import" }
] as const;

export function Sidebar({ role, name }: { role: Role; name?: string | null }) {
  return (
    <aside className="sidebar">
      <h1>ParkAndTran</h1>
      <p className="muted" style={{ color: "rgba(244, 247, 251, 0.72)" }}>
        {name ?? "User"} · {role === "admin" ? "Admin" : "Officer"}
      </p>
      <nav>
        {links.filter((link) => can(role, link.permission)).map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <SignOutButton />
      </nav>
    </aside>
  );
}
