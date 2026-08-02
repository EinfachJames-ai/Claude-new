"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

type DayValue = {
  weekday: number;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
};

export default function OpeningHoursForm({ initialValues }: { initialValues: DayValue[] }) {
  const router = useRouter();
  const [days, setDays] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateDay(weekday: number, patch: Partial<DayValue>) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
    setSuccess(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/opening-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          days.map((d) => ({
            weekday: d.weekday,
            isClosed: d.isClosed,
            opensAt: d.isClosed ? null : d.opensAt || null,
            closesAt: d.isClosed ? null : d.closesAt || null,
          }))
        ),
      });

      if (!response.ok) {
        const data = await response.json();
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
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-3">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Geschlossen</th>
              <th className="px-4 py-3">Von</th>
              <th className="px-4 py-3">Bis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {days.map((day) => (
              <tr key={day.weekday}>
                <td className="px-4 py-3 font-medium text-anthracite">
                  {WEEKDAY_LABELS[day.weekday]}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={day.isClosed}
                    onChange={(e) => updateDay(day.weekday, { isClosed: e.target.checked })}
                    className="h-4 w-4 rounded border-neutral-300 text-rust focus:ring-rust"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    disabled={day.isClosed}
                    value={day.opensAt}
                    onChange={(e) => updateDay(day.weekday, { opensAt: e.target.value })}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-sm disabled:bg-neutral-100 disabled:text-neutral-400"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    disabled={day.isClosed}
                    value={day.closesAt}
                    onChange={(e) => updateDay(day.weekday, { closesAt: e.target.value })}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-sm disabled:bg-neutral-100 disabled:text-neutral-400"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">Öffnungszeiten gespeichert.</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-rust px-5 py-2 text-sm font-semibold text-cream transition hover:bg-rust-dark disabled:opacity-60"
      >
        {isSubmitting ? "Speichern…" : "Öffnungszeiten speichern"}
      </button>
    </form>
  );
}
