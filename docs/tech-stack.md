# Tech Stack

This document defines the canonical technology stack for the Codex event platform.

## Application Stack

- `Nuxt` for the web application
- `shadcn-vue` for the component primitive layer
- `Tailwind CSS` for the interface styling system
- `Zod` for validation and data contracts
- `Drizzle ORM` for database schema management and queries
- `Vitest` for unit and integration testing
- `Playwright` for end-to-end testing
- `Cloudflare Workers` for application hosting and server-side execution
- `Cloudflare D1` for the primary relational database
- `Cloudflare R2` for file storage, including account profile icons, event background/banner images, platform default event background images, and public event gallery image delivery through custom domains
- `Cloudflare Images` bindings for protected event photo preview transformations
- `Cloudflare Queues` for asynchronous jobs, including retryable private Meetup talk-proposal decision email delivery
- `Cloudflare Cron Triggers` for scheduled platform tasks
- `Cloudflare Email Service` for outbound transactional email delivery
- `Auth0` for browser authentication, identity, and OAuth authorization of MCP clients
- `jose` for Auth0 JWT and JWKS validation on Cloudflare Workers
- `agents@0.20.1` with `@modelcontextprotocol/server@2.0.0` for stateless
  Streamable HTTP MCP 2026-07-28 handling on Cloudflare Workers.

## Architecture Notes

- Auth0 is responsible for authentication and identity.
- Application authorization remains in the platform database through event roles, team roles, approvals, and related business rules.
- `Cloudflare D1` is the primary relational database.
- Meetup talk proposals and their decision-delivery state remain private canonical data in D1. Cloudflare Queue messages reference proposal records and never make proposal bodies public or synchronize agenda entries.
- Remote MCP uses `createMcpHandler` from `agents/mcp/server`, creates a fresh
  MCP server for every request, and stores no protocol session. Auth0 owns OAuth
  grants and credentials. Trusted MCP clients are registered from administrator-
  configured HTTPS Client ID Metadata Documents; D1 holds application data and
  hashes for optional manual MCP access tokens only.
- A dedicated Cloudflare Workers rate-limit binding applies the 120-request per
  manual credential or OAuth user/client pair per minute MCP envelope limit. The binding is
  protective and eventually consistent, not an accounting ledger.
