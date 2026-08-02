type FooterProps = {
  restaurantName: string;
  addressStreet: string;
  addressCity: string;
  phone: string;
  email: string;
};

export default function Footer({
  restaurantName,
  addressStreet,
  addressCity,
  phone,
  email,
}: FooterProps) {
  return (
    <footer className="mt-auto bg-anthracite text-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-serif text-lg font-bold">{restaurantName}</p>
          <p className="mt-2 text-sm text-cream/70">
            Herzhaft. Ehrlich. Modern.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cream/50">
            Adresse
          </p>
          <p className="mt-2 text-sm text-cream/80">{addressStreet}</p>
          <p className="text-sm text-cream/80">{addressCity}</p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cream/50">
            Kontakt
          </p>
          <p className="mt-2 text-sm text-cream/80">{phone}</p>
          <p className="text-sm text-cream/80">{email}</p>
        </div>
      </div>
      <div className="border-t border-cream/10 px-4 py-4 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {restaurantName}. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
