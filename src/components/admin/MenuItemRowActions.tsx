"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MenuItemRowActions({
  id,
  isAvailable,
}: {
  id: string;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);

  async function toggleAvailability() {
    setIsBusy(true);
    try {
      await fetch(`/api/admin/menu-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !isAvailable }),
      });
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Dieses Gericht wirklich löschen?")) return;
    setIsBusy(true);
    try {
      await fetch(`/api/admin/menu-items/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        onClick={toggleAvailability}
        disabled={isBusy}
        className="text-anthracite/70 underline-offset-2 hover:text-rust hover:underline disabled:opacity-50"
      >
        {isAvailable ? "Ausblenden" : "Anzeigen"}
      </button>
      <button
        onClick={handleDelete}
        disabled={isBusy}
        className="text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
      >
        Löschen
      </button>
    </div>
  );
}
