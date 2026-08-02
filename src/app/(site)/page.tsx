import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/menu";

export default async function HomePage() {
  const [settings, highlights] = await Promise.all([
    prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      take: 3,
    }),
  ]);

  return (
    <div>
      <section className="bg-anthracite text-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 sm:px-6">
          <p className="font-serif text-sm uppercase tracking-[0.3em] text-gold">
            {settings.restaurantName}
          </p>
          <h1 className="max-w-2xl font-serif text-4xl font-bold leading-tight sm:text-5xl">
            {settings.heroTitle}
          </h1>
          <p className="max-w-xl text-lg text-cream/80">{settings.heroSubtitle}</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/speisekarte"
              className="rounded-lg bg-rust px-6 py-3 text-sm font-semibold text-cream transition hover:bg-rust-dark"
            >
              Speisekarte ansehen
            </Link>
            <Link
              href="/kontakt"
              className="rounded-lg border border-cream/30 px-6 py-3 text-sm font-semibold text-cream transition hover:bg-cream/10"
            >
              Tisch reservieren
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <p className="font-serif text-3xl font-bold text-rust">100%</p>
            <p className="mt-2 text-sm text-anthracite/70">
              Regionale Zutaten, frisch und mit Sorgfalt zubereitet.
            </p>
          </div>
          <div>
            <p className="font-serif text-3xl font-bold text-rust">Seit Jahren</p>
            <p className="mt-2 text-sm text-anthracite/70">
              Ehrliche Gastfreundschaft in gemütlicher Atmosphäre.
            </p>
          </div>
          <div>
            <p className="font-serif text-3xl font-bold text-rust">Täglich frisch</p>
            <p className="mt-2 text-sm text-anthracite/70">
              Unsere Speisekarte wechselt saisonal – für vollen Geschmack.
            </p>
          </div>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="bg-cream-dark py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-serif text-3xl font-bold text-anthracite">Unsere Highlights</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.id} className="rounded-xl bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-lg font-semibold text-anthracite">
                      {item.name}
                    </h3>
                    <span className="whitespace-nowrap font-semibold text-rust">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-anthracite/70">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Link
                href="/speisekarte"
                className="text-sm font-semibold text-rust hover:underline"
              >
                Zur gesamten Speisekarte →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
