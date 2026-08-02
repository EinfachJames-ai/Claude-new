# Zur rostigen Gabel – Website & Admin-Panel

Vollständige Webpräsenz für das Restaurant **„Zur rostigen Gabel“**: ein öffentliches
Kunden-Frontend (Startseite, Über uns, Speisekarte, Kontakt) und ein geschütztes
Admin-Panel, über das der Inhaber alle Inhalte selbst pflegen kann – ohne den Code
anzufassen.

## Tech-Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS 4** für das Styling
- **Prisma ORM 7** mit **SQLite** als Datenbank
- Eigene, schlanke Session-Authentifizierung (JWT via `jose`, HttpOnly-Cookie) für den Admin-Bereich

## Voraussetzungen

- Node.js 20 oder neuer
- npm

## Einrichtung

### 1. Abhängigkeiten installieren

```bash
npm install
```

`npm install` generiert automatisch den Prisma-Client (`postinstall`-Skript).

### 2. Umgebungsvariablen konfigurieren

Kopiere die Beispieldatei und passe die Werte bei Bedarf an:

```bash
cp .env.example .env
```

In der `.env` sind folgende Variablen wichtig:

| Variable         | Beschreibung                                                        |
| ---------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`   | Pfad zur SQLite-Datenbankdatei (Standard: `file:./dev.db`)            |
| `SESSION_SECRET` | Geheimer Schlüssel zum Signieren der Admin-Session. Für den produktiven Einsatz neu generieren: `openssl rand -base64 32` |
| `ADMIN_EMAIL`    | E-Mail-Adresse des initialen Admin-Accounts (wird beim Seeding angelegt) |
| `ADMIN_PASSWORD` | Passwort des initialen Admin-Accounts (wird beim Seeding gehasht gespeichert) |

### 3. Datenbank initialisieren

Erstellt die SQLite-Datenbank und wendet das Prisma-Schema an:

```bash
npm run db:migrate
```

Befüllt die Datenbank anschließend mit Beispieldaten (Admin-Account, Öffnungszeiten,
Kontaktdaten und einer Beispiel-Speisekarte für „Zur rostigen Gabel“):

```bash
npm run db:seed
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Die Website ist danach unter [http://localhost:3000](http://localhost:3000) erreichbar,
das Admin-Panel unter [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

**Standard-Zugangsdaten nach dem Seeding** (aus `.env`, siehe `.env.example`):

- E-Mail: `admin@zur-rostigen-gabel.de`
- Passwort: `RostigeGabel2026!`

> Bitte nach dem ersten Login zeitnah ein eigenes, sicheres Passwort in der Datenbank
> hinterlegen bzw. `ADMIN_PASSWORD` in `.env` ändern und `npm run db:seed` erneut
> ausführen, bevor die Seite produktiv geht.

## Weitere nützliche Befehle

| Befehl               | Beschreibung                                                |
| -------------------- | ------------------------------------------------------------ |
| `npm run build`       | Erstellt den Produktions-Build                                |
| `npm run start`       | Startet den Produktions-Build (nach `npm run build`)          |
| `npm run lint`        | Führt ESLint aus                                              |
| `npm run db:migrate`  | Wendet Prisma-Migrationen an (`prisma migrate dev`)           |
| `npm run db:seed`     | Führt das Seed-Script erneut aus (`prisma db seed`)           |
| `npm run db:studio`   | Öffnet Prisma Studio zur direkten Ansicht/Bearbeitung der DB  |

## Projektstruktur

```
prisma/
  schema.prisma        # Datenbankschema (MenuItem, OpeningHour, SiteSettings, ContactMessage, AdminUser)
  seed.ts               # Seed-Script mit Beispieldaten für "Zur rostigen Gabel"
src/
  app/
    (site)/             # Öffentliches Frontend (Startseite, Über uns, Speisekarte, Kontakt)
    admin/
      login/            # Öffentliche Login-Seite
      (dashboard)/      # Geschütztes Admin-Panel (Dashboard, Speisekarte, Einstellungen, Nachrichten)
    api/
      admin/            # Geschützte API-Routen für das CMS (CRUD)
      auth/              # Login/Logout
      contact/           # Öffentliche Route für das Kontaktformular
  components/
    admin/               # UI-Bausteine des Admin-Panels
    site/                 # UI-Bausteine des öffentlichen Frontends
  lib/
    auth.ts               # Session-/JWT-Hilfsfunktionen
    prisma.ts             # Prisma-Client-Singleton
    menu.ts               # Kategorie-Labels & Preisformatierung
  proxy.ts                # Schützt /admin und /api/admin vor unauthentifiziertem Zugriff
```

## Content-Management über das Admin-Panel

Im Admin-Panel (`/admin`) kann der Inhaber ohne Code-Kenntnisse:

- **Speisekarte**: Gerichte/Getränke anlegen, bearbeiten, ein-/ausblenden und löschen
  (Name, Beschreibung, Preis, Kategorie: Vorspeisen, Hauptgerichte, Desserts, Getränke).
- **Einstellungen**: Restaurantname, Texte für Startseite und „Über uns“, Adresse,
  Telefon, E-Mail sowie die Öffnungszeiten für jeden Wochentag anpassen.
- **Nachrichten**: Eingegangene Kontaktanfragen aus dem Frontend einsehen, als
  gelesen/ungelesen markieren oder löschen.

Alle Änderungen werden sofort auf der öffentlichen Website sichtbar.
