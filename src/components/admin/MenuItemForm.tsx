"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/menu";
import type { MenuCategory } from "@/generated/prisma/enums";

type MenuItemFormValues = {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  isAvailable: boolean;
};

export default function MenuItemForm({ initialValues }: { initialValues?: MenuItemFormValues }) {
  const router = useRouter();
  const isEditing = Boolean(initialValues?.id);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [price, setPrice] = useState(initialValues?.price?.toString() ?? "");
  const [category, setCategory] = useState<MenuCategory>(initialValues?.category ?? "HAUPTGERICHT");
  const [isAvailable, setIsAvailable] = useState(initialValues?.isAvailable ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedPrice = Number(price.replace(",", "."));
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Bitte einen gültigen Preis angeben.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/admin/menu-items/${initialValues!.id}` : "/api/admin/menu-items";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: parsedPrice,
          category,
          isAvailable,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      router.push("/admin/menu");
      router.refresh();
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-anthracite">
          Name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-anthracite">
          Beschreibung
        </label>
        <textarea
          id="description"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="mb-1 block text-sm font-medium text-anthracite">
            Preis (€)
          </label>
          <input
            id="price"
            required
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="12,50"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
          />
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-anthracite">
            Kategorie
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MenuCategory)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-anthracite">
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-rust focus:ring-rust"
        />
        Verfügbar / auf der Website sichtbar
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-rust px-5 py-2 text-sm font-semibold text-cream transition hover:bg-rust-dark disabled:opacity-60"
        >
          {isSubmitting ? "Speichern…" : isEditing ? "Änderungen speichern" : "Gericht anlegen"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/menu")}
          className="rounded-lg border border-neutral-300 px-5 py-2 text-sm font-semibold text-anthracite transition hover:border-rust"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
