import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, CATEGORY_ORDER, formatPrice } from "@/lib/menu";

export const metadata: Metadata = {
  title: "Speisekarte – Zur rostigen Gabel",
};

export default async function MenuPage() {
  const menuItems = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <p className="font-serif text-sm uppercase tracking-[0.3em] text-gold">Unser Angebot</p>
      <h1 className="mt-3 font-serif text-4xl font-bold text-anthracite">Speisekarte</h1>
      <p className="mt-4 text-anthracite/70">
        Alle Gerichte werden frisch zubereitet. Bitte informieren Sie unser Team über
        Allergien oder Unverträglichkeiten.
      </p>

      <div className="mt-12 space-y-12">
        {CATEGORY_ORDER.map((category) => {
          const items = menuItems.filter((item) => item.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category}>
              <h2 className="border-b border-rust/20 pb-2 font-serif text-2xl font-semibold text-rust">
                {CATEGORY_LABELS[category]}
              </h2>
              <div className="mt-6 space-y-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-6">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-anthracite">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-anthracite/70">{item.description}</p>
                    </div>
                    <span className="whitespace-nowrap font-serif text-lg font-semibold text-rust">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {menuItems.length === 0 && (
          <p className="text-anthracite/60">Die Speisekarte wird derzeit aktualisiert.</p>
        )}
      </div>
    </section>
  );
}
