import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json(
        {
            success: false,
            message: "Test availability endpoint disabled in production",
        },
        { status: 501 }
    );
}
