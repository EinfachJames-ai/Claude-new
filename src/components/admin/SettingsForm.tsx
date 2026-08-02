"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SettingsValues = {
  restaurantName: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  addressStreet: string;
  addressCity: string;
  phone: string;
  email: string;
  mapUrl: string | null;
};

export default function SettingsForm({ initialValues }: { initialValues: SettingsValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, mapUrl: values.mapUrl ?? "" }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-anthracite">Restaurantname</label>
        <input
          required
          value={values.restaurantName}
          onChange={(e) => update("restaurantName", e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthracite">Hero-Titel (Startseite)</label>
        <input
          required
          value={values.heroTitle}
          onChange={(e) => update("heroTitle", e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthracite">Hero-Untertitel</label>
        <textarea
          required
          rows={2}
          value={values.heroSubtitle}
          onChange={(e) => update("heroSubtitle", e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthracite">Titel &bdquo;Über uns&ldquo;</label>
        <input
          required
          value={values.aboutTitle}
          onChange={(e) => update("aboutTitle", e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthracite">Text &bdquo;Über uns&ldquo;</label>
        <textarea
          required
          rows={5}
          value={values.aboutText}
          onChange={(e) => update("aboutText", e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-anthracite">Straße & Hausnummer</label>
          <input
            required
            value={values.addressStreet}
            onChange={(e) => update("addressStreet", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-anthracite">PLZ & Ort</label>
          <input
            required
            value={values.addressCity}
            onChange={(e) => update("addressCity", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-anthracite">Telefon</label>
          <input
            required
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-anthracite">E-Mail</label>
          <input
            required
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthracite">
          Google-Maps-Link (optional)
        </label>
        <input
          value={values.mapUrl ?? ""}
          onChange={(e) => update("mapUrl", e.target.value)}
          placeholder="https://maps.google.com/..."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">Änderungen gespeichert.</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-rust px-5 py-2 text-sm font-semibold text-cream transition hover:bg-rust-dark disabled:opacity-60"
      >
        {isSubmitting ? "Speichern…" : "Speichern"}
      </button>
    </form>
  );
}
