## Better Auth Demo

Demo minimo com Next.js App Router, Better Auth, GitHub OAuth e SQLite local.

## Variaveis de ambiente

Crie um arquivo .env.local com:

```bash
BETTER_AUTH_SECRET=uma-string-bem-grande
BETTER_AUTH_URL=http://127.0.0.1:3101
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3101
GITHUB_CLIENT_ID=seu-client-id
GITHUB_CLIENT_SECRET=seu-client-secret
```

No GitHub OAuth App, configure a callback para:

```bash
http://127.0.0.1:3101/api/auth/callback/github
```

## Como conseguir as chaves do GitHub

1. Acesse GitHub > Settings > Developer settings > OAuth Apps.
2. Clique em New OAuth App.
3. Preencha os campos assim:

```text
Application name: Better Auth Demo Local
Homepage URL: http://127.0.0.1:3101
Authorization callback URL: http://127.0.0.1:3101/api/auth/callback/github
```

4. Salve o app.
5. Copie o Client ID exibido na tela e cole em GITHUB_CLIENT_ID no .env.local.
6. Clique em Generate a new client secret.
7. Copie o Client Secret gerado e cole em GITHUB_CLIENT_SECRET no .env.local.

Se voce quiser rodar em outra porta, atualize os tres pontos juntos:

- BETTER_AUTH_URL
- NEXT_PUBLIC_APP_URL
- Authorization callback URL no GitHub

## Rodando o projeto

```bash
npm install
npx @better-auth/cli migrate --yes
npm run dev -- --port 3101
```

Abra http://127.0.0.1:3101.

## Estrutura principal

- app/api/auth/[...all]/route.ts: handler do Better Auth no App Router.
- lib/auth.ts: configuracao do Better Auth com GitHub e SQLite.
- lib/auth-client.ts: client-side auth para login social e logout.
- app/page.tsx: home que exibe estado da sessao.
- components/auth-actions.tsx: botoes de entrar e sair.
