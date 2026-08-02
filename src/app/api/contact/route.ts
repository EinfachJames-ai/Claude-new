import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const contactSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich.").max(200),
  email: z.string().email("Bitte eine gültige E-Mail-Adresse angeben."),
  phone: z.string().max(50).optional().or(z.literal("")),
  message: z.string().min(1, "Nachricht darf nicht leer sein.").max(5000),
  // Honeypot-Feld gegen einfache Spam-Bots: muss leer bleiben.
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
      { status: 400 }
    );
  }

  const { name, email, phone, message } = parsed.data;

  await prisma.contactMessage.create({
    data: { name, email, phone: phone || null, message },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
