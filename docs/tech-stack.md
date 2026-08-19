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
- `Cloudflare Images` bindings for bounded public responsive variants and protected event photo preview transformations
- `Cloudflare Queues` for asynchronous jobs, including retryable private Meetup talk-proposal decision email delivery
- `Cloudflare Cron Triggers` for scheduled platform tasks
- `Cloudflare Email Service` for outbound transactional email delivery
- `Auth0` for browser authentication, identity, and OAuth authorization of MCP clients
- `jose` for Auth0 JWT and JWKS validation on Cloudflare Workers
- `agents@0.20.1` with `@modelcontextprotocol/server@2.0.0` for stateless
  Streamable HTTP MCP 2026-07-28 handling on Cloudflare Workers.

## Delivery and Request Topology

- Public homepage, event discovery, public event detail, and public outcome or media delivery use public-safe payloads and may use cacheable SSR or static delivery. They do not wait for authenticated actor or capability data.
- `/account/**`, `/admin/**`, and prize-redemption workspaces use an immediate client-rendered or static shell. Their document delivery does not perform D1-backed authenticated SSR; every API still performs server-side session, consent, and authorization checks.
- The client has one typed account bootstrap containing session identity, platform account, consent, roles, and derived capabilities. The shared account client loads it once for a navigation or workspace and route guards and feature components consume that result. Feature-local `/api/session` calls and query-only tab actor refreshes are prohibited.
- Each authenticated API request resolves the request actor once and shares it across authorization and domain work. Login and account-link routes own identity reconciliation; ordinary API reads do not reconcile identities. Mutations enforce canonical platform authorization and current consent requirements.
- Data-heavy event tabs use page-shaped JSON read endpoints. After account bootstrap, a tab has one critical data request, one authorization resolution, and one logical D1 request session. The endpoint returns the tab's first-render data in a typed contract; it is not a generic graph abstraction. Abandoned tab requests are cancelled, heavy tab code is locally bundled and lazy, and runtime `unpkg` editor dependencies are not supported.

## D1 Access and Consistency

- D1 access uses one shared request-scoped client and one logical session. Domain functions receive that access and do not create separate bindings, Drizzle clients, or session handles.
- Replica-eligible reads are pure public or non-sensitive workspace reads where bounded staleness is acceptable. Actor, consent, permission, lifecycle, mutation-result, and read-after-write paths use primary or otherwise strong consistency.
- D1 Sessions bookmarks carry the causal position from a write or earlier session into a later read. A mutation/read sequence passes the latest bookmark or remains on primary; an unbookmarked replica read must not serve read-after-write data.
- The latest D1 Sessions bookmark is transported as the `X-D1-Bookmark` request and response header. It is request metadata and never appears in a domain response or request payload.
- Read-only HTTP requests start with `first-unconstrained`; mutations and explicitly strong reads start with `first-primary` unless an incoming `X-D1-Bookmark` anchors the session. A request uses one consistency constraint and one shared Drizzle client for all domain work.
- The local fake-D1 and Worker D1 adapters expose equivalent client, session, bookmark, and consistency behavior. Tests exercise shared request reuse and read-after-write paths without test-only bypasses.

## Media Delivery

- Public and versioned images are streamed from managed storage through cacheable URLs. Cloudflare Images produces a bounded set of named responsive variants; callers do not request arbitrary dimensions.
- Private or mutable media and stored originals remain isolated behind authorization. Page backgrounds use versioned cacheable variants and never use public `no-store` original media responses.

## Architecture Notes

- Auth0 is responsible for authentication and identity.
- Application authorization remains in the platform database through event roles, team roles, approvals, and related business rules.
- `Cloudflare D1` is the primary relational database.
- Meetup talk proposals and their decision-delivery state remain private canonical data in D1. Cloudflare Queue messages reference proposal records and never make proposal bodies public or synchronize agenda entries.
- Remote MCP uses `createMcpHandler` from `agents/mcp/server`, creates a fresh
  MCP server for every request, and stores no protocol session. Auth0 owns OAuth
  grants and credentials. Standards clients can use Auth0 Dynamic Client
  Registration, while configured HTTPS Client ID Metadata Documents are
  administrator-approved and reconciled for clients that use CIMD. D1 holds
  application data and hashes for optional manual MCP access tokens only.
- A dedicated Cloudflare Workers rate-limit binding applies the 120-request per
  manual credential or OAuth user/client pair per minute MCP envelope limit. The binding is
  protective and eventually consistent, not an accounting ledger.
