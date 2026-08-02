import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@zur-rostigen-gabel.de";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "RostigeGabel2026!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      name: "Inhaber",
    },
  });
  console.log(`Admin-Benutzer bereit: ${adminEmail}`);

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      restaurantName: 'Zur rostigen Gabel',
      heroTitle: "Herzhaft. Ehrlich. Zur rostigen Gabel.",
      heroSubtitle:
        "Deftige Hausmannskost und moderne Küche in gemütlicher Atmosphäre – mitten im Herzen der Stadt.",
      aboutTitle: "Über uns",
      aboutText:
        "Seit vielen Jahren verwöhnen wir unsere Gäste mit ehrlicher, regionaler Küche und Gerichten mit Charakter.\nIn unserem Restaurant \"Zur rostigen Gabel\" treffen traditionelle Rezepte auf moderne Interpretationen – serviert in warmer, einladender Atmosphäre.\nUnser Team legt größten Wert auf frische, saisonale Zutaten von Erzeugern aus der Region und auf einen herzlichen Service, bei dem sich jeder Gast wie zu Hause fühlt.",
      addressStreet: "Hauptstraße 12",
      addressCity: "12345 Musterstadt",
      phone: "+49 123 456789",
      email: "info@zur-rostigen-gabel.de",
      mapUrl: null,
    },
  });
  console.log("Website-Einstellungen angelegt.");

  const openingHours = [
    { weekday: 0, isClosed: true, opensAt: null, closesAt: null }, // Sonntag
    { weekday: 1, isClosed: true, opensAt: null, closesAt: null }, // Montag (Ruhetag)
    { weekday: 2, isClosed: false, opensAt: "11:30", closesAt: "22:00" }, // Dienstag
    { weekday: 3, isClosed: false, opensAt: "11:30", closesAt: "22:00" }, // Mittwoch
    { weekday: 4, isClosed: false, opensAt: "11:30", closesAt: "22:00" }, // Donnerstag
    { weekday: 5, isClosed: false, opensAt: "11:30", closesAt: "23:00" }, // Freitag
    { weekday: 6, isClosed: false, opensAt: "12:00", closesAt: "23:00" }, // Samstag
  ];

  for (const day of openingHours) {
    await prisma.openingHour.upsert({
      where: { weekday: day.weekday },
      update: day,
      create: day,
    });
  }
  console.log("Öffnungszeiten angelegt.");

  const existingMenuItems = await prisma.menuItem.count();
  if (existingMenuItems === 0) {
    await prisma.menuItem.createMany({
      data: [
        // Vorspeisen
        {
          name: "Rostige Zwiebelsuppe",
          description: "Kräftige Rinderbrühe, karamellisierte Zwiebeln, geröstetes Bauernbrot, Bergkäse überbacken.",
          price: 6.9,
          category: "VORSPEISE",
          sortOrder: 1,
        },
        {
          name: "Landsalat mit Croutons",
          description: "Bunter Blattsalat, Kirschtomaten, Gurke, hausgemachtes Kräuterdressing, geröstete Croutons.",
          price: 7.5,
          category: "VORSPEISE",
          sortOrder: 2,
        },
        {
          name: "Rustikale Brotzeit",
          description: "Auswahl regionaler Wurst- und Käsespezialitäten mit Butter, Radieschen und Bauernbrot.",
          price: 9.9,
          category: "VORSPEISE",
          sortOrder: 3,
        },
        // Hauptgerichte
        {
          name: "Gabel-Schweinebraten",
          description: "Krustenbraten vom Schwein, dunkle Sauce, Kartoffelknödel, Rotkohl mit Apfel.",
          price: 16.9,
          category: "HAUPTGERICHT",
          sortOrder: 1,
        },
        {
          name: "Rostiger Rinderschmorbraten",
          description: "Langsam geschmortes Rindfleisch in Rotweinsauce, Butterspätzle, glasierte Karotten.",
          price: 19.5,
          category: "HAUPTGERICHT",
          sortOrder: 2,
        },
        {
          name: "Forelle \"Müllerin Art\"",
          description: "Frische Forelle aus der Region, in Butter gebraten, Mandelbutter, Petersilkartoffeln.",
          price: 18.5,
          category: "HAUPTGERICHT",
          sortOrder: 3,
        },
        {
          name: "Gebackenes Gemüseschnitzel",
          description: "Knusprig gebackenes Gemüseschnitzel, Kräuterquark, gemischter Salat, Bratkartoffeln.",
          price: 14.9,
          category: "HAUPTGERICHT",
          sortOrder: 4,
        },
        // Desserts
        {
          name: "Rostiger Apfelstrudel",
          description: "Hausgemachter Apfelstrudel mit Zimt, Rosinen, Vanillesauce und einer Kugel Eis.",
          price: 6.5,
          category: "DESSERT",
          sortOrder: 1,
        },
        {
          name: "Schokoladentörtchen",
          description: "Warmes Schokoladentörtchen mit flüssigem Kern, dazu Vanilleeis und Beerenragout.",
          price: 7.2,
          category: "DESSERT",
          sortOrder: 2,
        },
        {
          name: "Käseauswahl der Region",
          description: "Drei regionale Käsesorten mit Feigensenf, Nüssen und frischem Baguette.",
          price: 8.9,
          category: "DESSERT",
          sortOrder: 3,
        },
        // Getränke
        {
          name: "Hausgemachte Apfelschorle",
          description: "Naturtrüber Apfelsaft aus der Region, fein prickelnd.",
          price: 3.5,
          category: "GETRAENK",
          sortOrder: 1,
        },
        {
          name: "Rostiges Landbier 0,4l",
          description: "Untergäriges Bier von einer regionalen Brauerei, vom Fass gezapft.",
          price: 4.2,
          category: "GETRAENK",
          sortOrder: 2,
        },
        {
          name: "Hauswein Rot / Weiß, 0,2l",
          description: "Wechselnde Auswahl regionaler Winzer, auf Anfrage von unserem Service empfohlen.",
          price: 5.5,
          category: "GETRAENK",
          sortOrder: 3,
        },
        {
          name: "Bio-Mineralwasser 0,3l",
          description: "Still oder spritzig.",
          price: 3.2,
          category: "GETRAENK",
          sortOrder: 4,
        },
      ],
    });
    console.log("Speisekarte mit Beispielgerichten befüllt.");
  } else {
    console.log("Speisekarte bereits befüllt – überspringe Beispielgerichte.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
