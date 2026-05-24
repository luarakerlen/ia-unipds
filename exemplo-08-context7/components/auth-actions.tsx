"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type AuthActionsProps = {
  isAuthenticated: boolean;
};

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
    >
      <path d="M12 1.25a10.75 10.75 0 0 0-3.4 20.94c.54.1.73-.23.73-.52 0-.26-.01-1.12-.02-2.03-2.98.65-3.61-1.27-3.61-1.27-.49-1.25-1.2-1.58-1.2-1.58-.98-.67.08-.66.08-.66 1.08.08 1.65 1.1 1.65 1.1.96 1.64 2.53 1.16 3.15.89.1-.69.38-1.16.68-1.42-2.38-.27-4.89-1.19-4.89-5.29 0-1.17.42-2.12 1.1-2.87-.11-.27-.48-1.37.11-2.85 0 0 .9-.29 2.95 1.1a10.2 10.2 0 0 1 5.36 0c2.05-1.39 2.95-1.1 2.95-1.1.59 1.48.22 2.58.11 2.85.68.75 1.1 1.7 1.1 2.87 0 4.11-2.51 5.01-4.9 5.28.39.34.73 1 .73 2.02 0 1.46-.02 2.63-.02 2.99 0 .29.19.63.74.52A10.75 10.75 0 0 0 12 1.25Z" />
    </svg>
  );
}

export function AuthActions({ isAuthenticated }: AuthActionsProps) {
  const [isPending, setIsPending] = useState(false);

  const handleGithubLogin = async () => {
    setIsPending(true);

    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  };

  const handleSignOut = async () => {
    setIsPending(true);

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  if (isAuthenticated) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Saindo..." : "Sair"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGithubLogin}
      disabled={isPending}
      className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <GitHubIcon />
      {isPending ? "Redirecionando..." : "Entrar com GitHub"}
    </button>
  );
}