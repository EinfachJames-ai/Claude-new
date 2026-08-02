"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nachricht konnte nicht gesendet werden.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-green-800">
        Vielen Dank für Ihre Nachricht! Wir melden uns so schnell wie möglich bei Ihnen.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-anthracite">
            Name
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-anthracite/20 bg-white px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-anthracite">
            Telefon (optional)
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-anthracite/20 bg-white px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-anthracite">
          E-Mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-anthracite/20 bg-white px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-anthracite">
          Nachricht
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-anthracite/20 bg-white px-3 py-2 text-sm focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-lg bg-rust px-6 py-3 text-sm font-semibold text-cream transition hover:bg-rust-dark disabled:opacity-60"
      >
        {status === "submitting" ? "Wird gesendet…" : "Nachricht senden"}
      </button>
    </form>
  );
}
