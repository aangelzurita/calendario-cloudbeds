import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const token = req.cookies.get("cal_auth")?.value;

    // En dev acepta cualquier cookie no vacía para evitar loops raros
    const valid =
        process.env.NODE_ENV !== "production"
            ? !!token
            : token === process.env.CAL_AUTH_TOKEN;

    if (!valid) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set(
            "from",
            req.nextUrl.pathname + req.nextUrl.search
        );
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/calendario", "/calendario/:path*"],
};
