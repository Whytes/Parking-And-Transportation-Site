"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { permissionMap, type Role } from "@/lib/permissions";

const links = [
  { href: "/citations", label: "Citations", permission: "citations" },
  { href: "/statistics", label: "Statistics", permission: "statistics" },
  { href: "/officers", label: "Officers", permission: "officers" },
  { href: "/import", label: "Import", permission: "import" }
] as const;

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav>
      {links.filter((link) => permissionMap[role].includes(link.permission)).map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link key={link.href} href={link.href} className={isActive ? "sidebar-link sidebar-link-active" : "sidebar-link"}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
