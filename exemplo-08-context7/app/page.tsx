import { headers } from "next/headers";

import { AuthActions } from "@/components/auth-actions";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const displayName = session?.user.name || session?.user.email;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-14 sm:px-10">
      <section className="grid w-full gap-8 overflow-hidden rounded-[2rem] border border-white/60 bg-[var(--surface)] p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div className="flex flex-col justify-between gap-8">
          <div className="space-y-5">
            <span className="inline-flex w-fit rounded-full border border-black/10 bg-black/5 px-4 py-1 text-sm font-medium text-black/70">
              Next.js + Better Auth + SQLite
            </span>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-[var(--accent)] sm:text-5xl">
                Hello World com login GitHub e persistencia local.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Este demo usa App Router, Better Auth oficial e SQLite local para guardar usuarios e sessoes.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-black/8 bg-white/70 p-5">
              <p className="text-sm font-medium text-[var(--muted)]">Estado atual</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--accent)]">
                {displayName ? `Logado como ${displayName}` : "Voce nao esta logado"}
              </p>
            </div>
            <div className="rounded-3xl border border-black/8 bg-black px-5 py-5 text-white">
              <p className="text-sm font-medium text-white/70">Sessao</p>
              <p className="mt-3 text-sm leading-6 text-white/90">
                {session?.session?.id
                  ? `Sessao ativa: ${session.session.id}`
                  : "Sem sessao ativa no momento."}
              </p>
            </div>
          </div>
        </div>

        <aside className="flex items-center">
          <div className="w-full rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Conta
            </p>
            <div className="mt-6 space-y-4">
              <h2 className="text-2xl font-semibold text-[var(--accent)]">Autenticacao social</h2>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Entre com GitHub para iniciar o OAuth. Depois do callback, esta pagina mostra o nome ou email salvo na sessao.
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-dashed border-black/10 bg-black/[0.02] p-4 text-sm text-[var(--muted)]">
              <p>Provider: GitHub</p>
              <p>Banco: better-auth.sqlite</p>
              <p>Rota: /api/auth/[...all]</p>
            </div>

            <div className="mt-8">
              <AuthActions isAuthenticated={Boolean(session?.user)} />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
