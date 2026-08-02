"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function MessageRow({ message }: { message: Message }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function toggleRead() {
    setIsBusy(true);
    try {
      await fetch(`/api/admin/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !message.isRead }),
      });
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Diese Nachricht wirklich löschen?")) return;
    setIsBusy(true);
    try {
      await fetch(`/api/admin/messages/${message.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        message.isRead ? "border-neutral-200 bg-white" : "border-rust/40 bg-rust/5"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <p className="font-semibold text-anthracite">{message.name}</p>
            {!message.isRead && (
              <span className="rounded-full bg-rust px-2 py-0.5 text-[10px] font-semibold uppercase text-cream">
                Neu
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            {message.email}
            {message.phone ? ` · ${message.phone}` : ""}
          </p>
          <p className={`mt-2 text-sm text-neutral-700 ${isExpanded ? "" : "line-clamp-2"}`}>
            {message.message}
          </p>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-xs text-neutral-400">
            {new Date(message.createdAt).toLocaleString("de-DE")}
          </p>
          <div className="flex gap-3 text-xs">
            <button
              onClick={toggleRead}
              disabled={isBusy}
              className="text-anthracite/70 underline-offset-2 hover:text-rust hover:underline disabled:opacity-50"
            >
              {message.isRead ? "Als ungelesen markieren" : "Als gelesen markieren"}
            </button>
            <button
              onClick={handleDelete}
              disabled={isBusy}
              className="text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
