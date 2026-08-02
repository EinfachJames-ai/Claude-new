import { prisma } from "@/lib/prisma";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar restaurantName={settings.restaurantName} />
      <main className="flex-1">{children}</main>
      <Footer
        restaurantName={settings.restaurantName}
        addressStreet={settings.addressStreet}
        addressCity={settings.addressCity}
        phone={settings.phone}
        email={settings.email}
      />
    </div>
  );
}
