import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const menuItemUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  category: z.enum(["VORSPEISE", "HAUPTGERICHT", "DESSERT", "GETRAENK"]).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = menuItemUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }

  try {
    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(menuItem);
  } catch {
    return NextResponse.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
  }
}
