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
- Strong consistency is the only production HTTP database path. The request-scoped accessors do not expose a generic consistency option or a public-replica accessor; actor, consent, permission, lifecycle, mutation-result, and read-after-write paths use the primary session or an incoming bookmark.
- D1 Sessions bookmarks carry the causal position from a write or earlier session into a later read. A mutation/read sequence passes the latest bookmark or remains on primary; an unbookmarked replica read must not serve read-after-write data.
- The latest D1 Sessions bookmark is transported as the `X-D1-Bookmark` request and response header. It is request metadata and never appears in a domain response or request payload.
- Strong HTTP requests start with `first-primary`, unless an incoming `X-D1-Bookmark` anchors the session. A request uses one consistency constraint and one shared Drizzle client for all domain work. Raw SQL uses the same request session's `prepare` and `batch` methods.
- The application database passed to domain code is created from a capability-narrowed request-session binding containing only `prepare` and `batch`. It is an application query facade: no raw D1 binding, public Drizzle `$client`, session construction, or capability that can create, replace, or bypass the request session/bookmark is exposed. Raw request-session `prepare` and `batch` access is available only through `getDatabaseSession(event)`.
- The application facade is explicit and allowlisted rather than a forwarding membrane. Supported operations are bound to the request session and dangerous or unsupported capabilities fail closed. Harmless Drizzle builder metadata/configuration such as `dialect`, `$dynamic`, or `toSQL` may remain reachable when it cannot reach a raw client or another session; the architecture does not require recursive object-graph opacity. Runtime and type tests block session/client/binding construction and raw prepare/batch escape paths while proving supported builder, result, and same-session behavior.
- HTTP requests do not trigger startup or recovery work. Queue consumers and scheduled recovery entrypoints construct a fresh non-HTTP database for background processing; ordinary HTTP domain work receives the request-scoped application database or session.
- HTTP handlers cannot resolve or use the raw D1 binding or inject database access through H3 context. Standalone constructors remain in explicit queue, scheduler, migration, worker, and test adapters. Direct database injection is limited to explicit non-HTTP test or infrastructure execution and is held outside public request context. One actual Nitro `beforeResponse` hook emits the bookmark for both API and raw routes, including successful and handled/error responses.
- Source/reachability tests scan the full production `server/` tree and do not allow mixed HTTP/non-HTTP modules to bypass the request boundary.
- The local fake-D1 and Worker D1 adapters expose equivalent client, session, bookmark, and consistency behavior. Tests exercise shared request reuse and read-after-write paths without test-only bypasses.

## Media Delivery

- Managed public media covers event background and banner images, the platform default event background, and public event-gallery photo responses. Each resource gets a collision-free immutable private R2 object key before upload; D1 stores the active object pointer and the resource revision only after the R2 write succeeds.
- Event background, event banner, platform-default background, gallery photos, and user profile icons have independent object pointers and revisions. Event public HTML/JSON visibility uses a separate `public_content_revision`, which rotates for public media, gallery visibility/removal, submission public visibility, and event completion or hide/unhide changes.
- Public event and platform-default image URLs include the exact current resource revision and the required `variant`. Gallery URLs use `variant=preview` for a 720px `scale-down` transform or `variant=original` for a bounded 2400px full-display `scale-down` transform. Public variants stream through Cloudflare Images; stored R2 originals are never public fallbacks.
- Newly issued public event HTML, JSON, and managed media responses use `Cache-Control: public, max-age=30, stale-if-error=0` and `Cloudflare-CDN-Cache-Control: public, max-age=30, stale-if-error=0`. They do not use `s-maxage`, long immutable freshness, or stale-on-error behavior.
- A Cloudflare cache hit can be served without invoking the Worker, and Cache API deletion is local to the executing data center rather than a global purge. D1 visibility and revision checks therefore apply on a miss or revalidation. The 30-second browser and edge freshness window is the revocation bound for newly issued managed URLs; the application does not use a runtime purge credential.
- Public managed-media routes validate visibility, the exact current revision, and the active object pointer before reading R2 or invoking Images. Removing or replacing media clears or rotates D1 first, then best-effort deletes the no-longer-referenced immutable object; a cleanup failure leaves private bytes that no route can serve. Missing, invalid, or stale revisions return not found.
- Generated certificate PNG/PDF responses and winner or published-project profile icons remain private, `no-store` responses. `profileIconUpdatedAt` is metadata; profile-icon URLs use the independent numeric `profile_icon_revision`.

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
