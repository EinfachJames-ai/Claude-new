import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    return NextResponse.json({ error: "E-Mail oder Passwort ist falsch." }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "E-Mail oder Passwort ist falsch." }, { status: 401 });
  }

  const token = await createSessionToken({ adminId: admin.id, email: admin.email });
  await setSessionCookie(token);

  return NextResponse.json({ success: true });
}
