"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
    const router = useRouter();
    const sp = useSearchParams();
    const from = sp.get("from") || "/calendario";

    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const r = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ user, pass }),
            });

            setLoading(false);

            if (r.ok) {
                setTimeout(() => {
                    window.location.replace("/calendario");
                }, 50);
                return;
            }

            const data = await r.json().catch(() => ({}));
            setError(data.error || "Credenciales incorrectas");
        } catch (err: any) {
            console.error("LOGIN FETCH ERROR:", err);
            setLoading(false);
            setError("No pude conectar con /api/login. ¿Server arriba?");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow"
            >
                <h1 className="text-2xl font-semibold mb-4">Acceso al calendario</h1>

                <label className="block text-sm mb-1">Usuario</label>
                <input
                    className="w-full mb-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 outline-none"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    autoComplete="username"
                    required
                />

                <label className="block text-sm mb-1">Contraseña</label>
                <input
                    className="w-full mb-4 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 outline-none"
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    autoComplete="current-password"
                    required
                />

                {error && (
                    <p className="text-red-400 text-sm mb-3">
                        {error}
                    </p>
                )}

                <button
                    className="w-full bg-emerald-600 hover:bg-emerald-500 transition rounded-lg py-2 font-medium disabled:opacity-60"
                    disabled={loading}
                >
                    {loading ? "Entrando..." : "Entrar"}
                </button>
            </form>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginInner />
        </Suspense>
    );
}
