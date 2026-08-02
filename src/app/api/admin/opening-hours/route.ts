import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const openingHourSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  opensAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
});

const openingHoursPayloadSchema = z.array(openingHourSchema).length(7);

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const hours = await prisma.openingHour.findMany({ orderBy: { weekday: "asc" } });
  return NextResponse.json(hours);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = openingHoursPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe für Öffnungszeiten." }, { status: 400 });
  }

  await Promise.all(
    parsed.data.map((day) =>
      prisma.openingHour.upsert({
        where: { weekday: day.weekday },
        update: {
          isClosed: day.isClosed,
          opensAt: day.isClosed ? null : day.opensAt ?? null,
          closesAt: day.isClosed ? null : day.closesAt ?? null,
        },
        create: {
          weekday: day.weekday,
          isClosed: day.isClosed,
          opensAt: day.isClosed ? null : day.opensAt ?? null,
          closesAt: day.isClosed ? null : day.closesAt ?? null,
        },
      })
    )
  );

  const hours = await prisma.openingHour.findMany({ orderBy: { weekday: "asc" } });
  return NextResponse.json(hours);
}
