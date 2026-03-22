# Codex Hackathons

Nuxt application for the Codex hackathon platform.

## Setup

Install dependencies:

```bash
bun install
```

Copy `.env.example` to `.env` and provide Auth0 credentials for a Regular Web Application:

```bash
NUXT_AUTH0_DOMAIN=your-tenant.auth0.com
NUXT_AUTH0_CLIENT_ID=your-auth0-client-id
NUXT_AUTH0_CLIENT_SECRET=your-auth0-client-secret
NUXT_AUTH0_SESSION_SECRET=$(openssl rand -hex 64)
NUXT_AUTH0_APP_BASE_URL=http://localhost:3000
NUXT_AUTH0_AUDIENCE=
```

Auth0 dashboard settings for local development:

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`

If you already have legacy Auth0 variables such as `NUXT_PUBLIC_AUTH0_*` or `AUTH0_*`, rename them to the `NUXT_AUTH0_*` keys above.

## Development

Start the development server:

```bash
bun run dev
```

The built-in Auth0 Nuxt routes are mounted at:

- `/auth/login`
- `/auth/logout`
- `/auth/callback`
- `/auth/backchannel-logout`

The protected example surface added in this repo is `/dashboard`.

## Validation

Run the project checks with:

```bash
bun run lint
bun run typecheck
```
