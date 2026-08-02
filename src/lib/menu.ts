import type { MenuCategory } from "@/generated/prisma/enums";

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  VORSPEISE: "Vorspeisen",
  HAUPTGERICHT: "Hauptgerichte",
  DESSERT: "Desserts",
  GETRAENK: "Getränke",
};

export const CATEGORY_ORDER: MenuCategory[] = [
  "VORSPEISE",
  "HAUPTGERICHT",
  "DESSERT",
  "GETRAENK",
];

export function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
}
