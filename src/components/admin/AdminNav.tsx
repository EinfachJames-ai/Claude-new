"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/menu", label: "Speisekarte" },
  { href: "/admin/settings", label: "Einstellungen" },
  { href: "/admin/messages", label: "Nachrichten" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-rust text-cream"
                : "text-cream/80 hover:bg-anthracite-light hover:text-cream"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
