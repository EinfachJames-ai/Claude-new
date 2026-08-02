import { prisma } from "@/lib/prisma";
import SettingsForm from "@/components/admin/SettingsForm";
import OpeningHoursForm from "@/components/admin/OpeningHoursForm";

export default async function AdminSettingsPage() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const existingHours = await prisma.openingHour.findMany({ orderBy: { weekday: "asc" } });
  const hoursByWeekday = new Map(existingHours.map((h) => [h.weekday, h]));

  const days = Array.from({ length: 7 }, (_, weekday) => {
    const existing = hoursByWeekday.get(weekday);
    return {
      weekday,
      isClosed: existing?.isClosed ?? weekday === 1,
      opensAt: existing?.opensAt ?? "11:30",
      closesAt: existing?.closesAt ?? "22:00",
    };
  });

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-serif text-3xl font-bold text-anthracite">Einstellungen</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Passe die Inhalte der Website an – ohne Code.
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold text-rust">
          Restaurant & Kontaktinformationen
        </h2>
        <SettingsForm
          initialValues={{
            restaurantName: settings.restaurantName,
            heroTitle: settings.heroTitle,
            heroSubtitle: settings.heroSubtitle,
            aboutTitle: settings.aboutTitle,
            aboutText: settings.aboutText,
            addressStreet: settings.addressStreet,
            addressCity: settings.addressCity,
            phone: settings.phone,
            email: settings.email,
            mapUrl: settings.mapUrl,
          }}
        />
      </section>

      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold text-rust">Öffnungszeiten</h2>
        <OpeningHoursForm initialValues={days} />
      </section>
    </div>
  );
}
