import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const settingsSchema = z.object({
  restaurantName: z.string().min(1),
  heroTitle: z.string().min(1),
  heroSubtitle: z.string().min(1),
  aboutTitle: z.string().min(1),
  aboutText: z.string().min(1),
  addressStreet: z.string().min(1),
  addressCity: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  mapUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }

  const { mapUrl, ...rest } = parsed.data;

  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { ...rest, mapUrl: mapUrl || null },
    create: { id: 1, ...rest, mapUrl: mapUrl || null },
  });

  return NextResponse.json(settings);
}
