"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded-lg border border-cream/30 px-3 py-1.5 text-sm text-cream transition hover:bg-cream/10 disabled:opacity-60"
    >
      Abmelden
    </button>
  );
}
