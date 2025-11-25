import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const user = String(body.user ?? "").trim();
  const pass = String(body.pass ?? "").trim();

  const USER = String(process.env.CALENDAR_USER ?? "").trim();
  const PASS = String(process.env.CALENDAR_PASS ?? "").trim();
  const TOKEN = process.env.CAL_AUTH_TOKEN;

  // ✅ DEBUG SEGURO (no imprime contraseña, solo longitud)
  console.log("LOGIN DEBUG:", {
    inputUser: user,
    inputPassLen: pass.length,
    envUser: USER,
    envPassLen: PASS.length,
    hasToken: !!TOKEN,
  });

  if (!USER || !PASS || !TOKEN) {
    return NextResponse.json(
      { ok: false, error: "Server not configured" },
      { status: 500 }
    );
  }

  if (user === USER && pass === PASS) {
    const res = NextResponse.json({ ok: true });

    res.cookies.set("cal_auth", TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ solo secure en prod (https)
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });


    return res;
  }

  return NextResponse.json(
    { ok: false, error: "Credenciales incorrectas" },
    { status: 401 }
  );
}
