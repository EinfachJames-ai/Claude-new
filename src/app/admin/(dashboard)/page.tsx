import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [menuItemCount, unreadMessageCount, totalMessageCount] = await Promise.all([
    prisma.menuItem.count(),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.contactMessage.count(),
  ]);

  const cards = [
    {
      href: "/admin/menu",
      label: "Gerichte in der Speisekarte",
      value: menuItemCount,
    },
    {
      href: "/admin/messages",
      label: "Ungelesene Nachrichten",
      value: unreadMessageCount,
    },
    {
      href: "/admin/messages",
      label: "Nachrichten insgesamt",
      value: totalMessageCount,
    },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-anthracite">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Willkommen zurück! Hier ist eine Übersicht deiner Website.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-rust hover:shadow-md"
          >
            <p className="text-3xl font-bold text-rust">{card.value}</p>
            <p className="mt-1 text-sm text-neutral-600">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/admin/menu/new"
          className="rounded-xl bg-rust px-5 py-4 text-center text-sm font-semibold text-cream transition hover:bg-rust-dark"
        >
          + Neues Gericht anlegen
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-xl border border-neutral-300 bg-white px-5 py-4 text-center text-sm font-semibold text-anthracite transition hover:border-rust"
        >
          Öffnungszeiten & Kontakt bearbeiten
        </Link>
        <Link
          href="/"
          target="_blank"
          className="rounded-xl border border-neutral-300 bg-white px-5 py-4 text-center text-sm font-semibold text-anthracite transition hover:border-rust"
        >
          Website ansehen ↗
        </Link>
      </div>
    </div>
  );
}
