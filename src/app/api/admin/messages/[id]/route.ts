import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const updateSchema = z.object({
  isRead: z.boolean(),
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
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  try {
    const message = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: parsed.data.isRead },
    });
    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: "Nachricht nicht gefunden." }, { status: 404 });
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
    await prisma.contactMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Nachricht nicht gefunden." }, { status: 404 });
  }
}
