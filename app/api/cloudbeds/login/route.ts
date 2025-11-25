import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();
    const user = String(body.user ?? "").trim();
    const pass = String(body.pass ?? "").trim();

    const USER = String(process.env.CALENDAR_USER ?? "").trim();
    const PASS = String(process.env.CALENDAR_PASS ?? "").trim();
    const TOKEN = process.env.CAL_AUTH_TOKEN;

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
            secure: true,
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
    console.log("LOGIN ENV CHECK", {
        USER: process.env.CALENDAR_USER,
        PASS_LEN: (process.env.CALENDAR_PASS || "").length,
    });

}
