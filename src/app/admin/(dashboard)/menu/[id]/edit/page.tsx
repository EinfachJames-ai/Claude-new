import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MenuItemForm from "@/components/admin/MenuItemForm";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const menuItem = await prisma.menuItem.findUnique({ where: { id } });

  if (!menuItem) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-anthracite">Gericht bearbeiten</h1>
      <p className="mt-1 text-sm text-neutral-600">{menuItem.name}</p>
      <div className="mt-8">
        <MenuItemForm
          initialValues={{
            id: menuItem.id,
            name: menuItem.name,
            description: menuItem.description,
            price: menuItem.price,
            category: menuItem.category,
            isAvailable: menuItem.isAvailable,
          }}
        />
      </div>
    </div>
  );
}
