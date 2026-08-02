import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, CATEGORY_ORDER, formatPrice } from "@/lib/menu";
import MenuItemRowActions from "@/components/admin/MenuItemRowActions";

export default async function AdminMenuPage() {
  const menuItems = await prisma.menuItem.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-anthracite">Speisekarte</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Verwalte Vorspeisen, Hauptgerichte, Desserts und Getränke.
          </p>
        </div>
        <Link
          href="/admin/menu/new"
          className="rounded-lg bg-rust px-4 py-2 text-sm font-semibold text-cream transition hover:bg-rust-dark"
        >
          + Neues Gericht
        </Link>
      </div>

      <div className="mt-8 space-y-10">
        {CATEGORY_ORDER.map((category) => {
          const items = menuItems.filter((item) => item.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category}>
              <h2 className="font-serif text-xl font-semibold text-rust">
                {CATEGORY_LABELS[category]}
              </h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Preis</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/menu/${item.id}/edit`}
                            className="font-medium text-anthracite hover:text-rust"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
                            {item.description}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatPrice(item.price)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.isAvailable
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-200 text-neutral-600"
                            }`}
                          >
                            {item.isAvailable ? "Sichtbar" : "Ausgeblendet"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MenuItemRowActions id={item.id} isAvailable={item.isAvailable} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {menuItems.length === 0 && (
          <p className="text-sm text-neutral-500">
            Noch keine Gerichte angelegt. Klicke auf &bdquo;Neues Gericht&ldquo;, um zu starten.
          </p>
        )}
      </div>
    </div>
  );
}
