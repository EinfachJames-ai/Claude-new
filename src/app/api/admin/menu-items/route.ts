import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const menuItemSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich."),
  description: z.string().min(1, "Beschreibung ist erforderlich."),
  price: z.number().positive("Preis muss größer als 0 sein."),
  category: z.enum(["VORSPEISE", "HAUPTGERICHT", "DESSERT", "GETRAENK"]),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const menuItems = await prisma.menuItem.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(menuItems);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = menuItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }

  const menuItem = await prisma.menuItem.create({ data: parsed.data });

  return NextResponse.json(menuItem, { status: 201 });
}
