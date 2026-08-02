import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ContactForm from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt – Zur rostigen Gabel",
};

const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

export default async function ContactPage() {
  const [settings, hours] = await Promise.all([
    prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.openingHour.findMany({ orderBy: { weekday: "asc" } }),
  ]);

  const hoursByWeekday = new Map(hours.map((h) => [h.weekday, h]));

  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <p className="font-serif text-sm uppercase tracking-[0.3em] text-gold">Kontakt</p>
      <h1 className="mt-3 font-serif text-4xl font-bold text-anthracite">
        Wir freuen uns auf Sie
      </h1>

      <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2">
        <div>
          <h2 className="font-serif text-xl font-semibold text-rust">Kontaktdaten</h2>
          <div className="mt-4 space-y-1 text-anthracite/80">
            <p>{settings.addressStreet}</p>
            <p>{settings.addressCity}</p>
            <p className="pt-2">{settings.phone}</p>
            <p>{settings.email}</p>
          </div>

          {settings.mapUrl && (
            <a
              href={settings.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-rust hover:underline"
            >
              Auf Google Maps ansehen ↗
            </a>
          )}

          <h2 className="mt-10 font-serif text-xl font-semibold text-rust">Öffnungszeiten</h2>
          <div className="mt-4 space-y-1 text-sm">
            {Array.from({ length: 7 }, (_, weekday) => {
              const day = hoursByWeekday.get(weekday);
              return (
                <div key={weekday} className="flex justify-between gap-4 text-anthracite/80">
                  <span>{WEEKDAY_LABELS[weekday]}</span>
                  <span>
                    {!day || day.isClosed
                      ? "Geschlossen"
                      : `${day.opensAt ?? "–"} – ${day.closesAt ?? "–"} Uhr`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-serif text-xl font-semibold text-rust">Nachricht senden</h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
