-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OpeningHour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekday" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "opensAt" TEXT,
    "closesAt" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "restaurantName" TEXT NOT NULL DEFAULT 'Zur rostigen Gabel',
    "heroTitle" TEXT NOT NULL DEFAULT 'Herzhaft. Ehrlich. Zur rostigen Gabel.',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Deftige Hausmannskost und moderne Küche in gemütlicher Atmosphäre.',
    "aboutTitle" TEXT NOT NULL DEFAULT 'Über uns',
    "aboutText" TEXT NOT NULL DEFAULT 'Seit vielen Jahren verwöhnen wir unsere Gäste mit ehrlicher, regionaler Küche und Gerichten mit Charakter. In unserem Restaurant "Zur rostigen Gabel" treffen traditionelle Rezepte auf moderne Interpretationen – serviert in warmer, einladender Atmosphäre.',
    "addressStreet" TEXT NOT NULL DEFAULT 'Hauptstraße 12',
    "addressCity" TEXT NOT NULL DEFAULT '12345 Musterstadt',
    "phone" TEXT NOT NULL DEFAULT '+49 123 456789',
    "email" TEXT NOT NULL DEFAULT 'info@zur-rostigen-gabel.de',
    "mapUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHour_weekday_key" ON "OpeningHour"("weekday");
