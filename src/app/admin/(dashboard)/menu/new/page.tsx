import MenuItemForm from "@/components/admin/MenuItemForm";

export default function NewMenuItemPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-anthracite">Neues Gericht</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Lege ein neues Gericht oder Getränk für die Speisekarte an.
      </p>
      <div className="mt-8">
        <MenuItemForm />
      </div>
    </div>
  );
}
