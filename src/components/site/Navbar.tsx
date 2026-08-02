"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Startseite" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/speisekarte", label: "Speisekarte" },
  { href: "/kontakt", label: "Kontakt" },
];

export default function Navbar({ restaurantName }: { restaurantName: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-anthracite/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-serif text-xl font-bold text-rust">
          {restaurantName}
        </Link>

        <nav className="hidden gap-8 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition ${
                pathname === link.href
                  ? "text-rust"
                  : "text-anthracite/80 hover:text-rust"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="sm:hidden"
          aria-label="Menü öffnen"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            {isOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {isOpen && (
        <nav className="flex flex-col gap-1 border-t border-anthracite/10 bg-cream px-4 pb-4 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === link.href
                  ? "bg-rust/10 text-rust"
                  : "text-anthracite/80 hover:bg-rust/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
