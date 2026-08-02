import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Über uns – Zur rostigen Gabel",
};

export default async function AboutPage() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <p className="font-serif text-sm uppercase tracking-[0.3em] text-gold">
        {settings.restaurantName}
      </p>
      <h1 className="mt-3 font-serif text-4xl font-bold text-anthracite">
        {settings.aboutTitle}
      </h1>
      <div className="mt-8 space-y-4 text-lg leading-relaxed text-anthracite/80">
        {settings.aboutText.split("\n").map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
