# Model Context Protocol

Codex Events exposes structured platform operations through a stateless
Streamable HTTP endpoint at `/mcp`. MCP is a protocol, authentication,
input/output, annotation, and error adapter around the same application
operations used by REST. It does not own authorization, lifecycle rules,
persistence, side effects, domain auditing, or serialization.

## Authentication

Auth0 OAuth is the recommended connection method. The server publishes OAuth
protected-resource metadata for the canonical `/mcp` URL and challenges
unauthenticated requests with a link to that metadata. Compatible clients use
Authorization Code with PKCE against the configured Auth0 authorization server
for the canonical MCP resource.

MCP 2026-07-28 clients identify themselves with an HTTPS Client ID Metadata
Document URL. A tenant administrator must explicitly trust each supported
client by importing that URL through Auth0 before the client can start an OAuth
flow. Deployment configuration contains the allowlisted metadata URLs and
reconciles them idempotently; Auth0 does not discover or approve unknown client
URLs automatically. The imported metadata supplies the client's redirect URIs,
including Codex's ephemeral loopback callback.

The Auth0 MCP resource server allows user-delegated access only through a client
grant, denies machine-only access, permits offline refresh for interactive
clients, and does not apply Auth0 RBAC. Platform roles, event roles, team
membership, judging assignments, and legal-document acceptance remain
authoritative in D1 and are evaluated for every request.

Auth0's default third-party user grant allows the `mcp` API permission for the
canonical resource. The grant authorizes trusted third-party clients to request
that resource; it is not an application role and is not required as a scope
claim because Codex does not request custom API permissions. The access token
must instead contain the `openid` and `email` identity scopes requested by the
client. The platform never broadens access for an unknown client or another
resource.

The endpoint validates the OAuth access token signature through the Auth0 JWKS,
then validates its issuer, expiry, exact audience, required identity scopes,
and subject. The
subject must map to an active platform user. Auth0 owns OAuth grants, access and
refresh tokens, client registration, and revocation; Codex Events stores none
of those credentials.

Manual MCP access tokens are a secondary method for clients that require a
copied bearer credential. Users create named tokens from account settings
through session-authenticated REST APIs. A manual credential contains a public
token identifier and high-entropy secret. The full value is shown once. D1
stores only a secure one-way hash and a safe display prefix. A user can have
five active tokens; creation enforces that limit atomically so concurrent
requests cannot exceed it. Each token expires exactly 30 days after creation
and can only be revoked, not renewed. Account deletion deletes the credentials.

The endpoint rejects absent, malformed, unknown, expired, revoked, or
deleted-owner manual credentials and invalid OAuth credentials with sanitized
errors. Cookies never authenticate `/mcp`. Both methods resolve the current
platform user, roles, team and judging relationships, and required-document
acceptance on every request.

## Operation Inventory

The source inventory is the shared operation registry. Eligibility is explicit:

- Include public structured discovery under `/api/events` and `/api/public`
  when the response is JSON and does not transfer raw files.
- Include signed-in structured JSON operations for account/profile, events,
  applications, teams and join requests, project submissions, judging,
  event/platform roles and settings, credits, outcomes and prize redemption,
  Meetup talk proposals, audit reads, and platform administration.
- Exclude `/api/auth`, `/auth`, account registration/linking/email verification,
  `/api/account/mcp-tokens`, `DELETE /api/account`, all profile/event image and
  photo binary upload/download routes, CSV imports, Luma webhooks and retry or
  backfill integration controls, queue consumers, startup recovery, email-send
  controls, and other system-only entrypoints.

The explicit manifest contains 149 included method/path pairs, including all
ten talk-proposal operations. Each appears once with a stable operation ID.
Every other concrete Nitro route has an exclusion reason in the same manifest;
completeness therefore does not depend on a route opting into the registry.
There is no generic REST passthrough, wildcard tool, fallback adapter, or
dual-read path.

## Registry Contract

Every operation declares:

- stable ID and user-facing tool description;
- one REST method and route template;
- operation-specific Zod input and output schemas for the complete structured
  envelope;
- explicit coarse capabilities that mirror the operation's actual guard and
  are used only for discovery;
- an explicit domain-effect classification from which read-only, destructive,
  and idempotent annotations are derived;
- one executor containing validation, exact authorization, lifecycle rules,
  persistence, side effects, domain audit, and serialization.

Field-level output schemas are generated from the inferred serialized return
type of each shared executor and checked into the registry. Validation fails
when a response type changes without regenerating its MCP contract; whole
payload `unknown`, `any`, or generic JSON schemas are not valid operation
contracts. Pagination metadata is inferred per operation. Audit metadata is the
only dynamic object contract: it is constrained to bounded JSON values because
the audit APIs intentionally return metadata from multiple domain action types.

The eligibility manifest is maintained independently for every concrete API
route. Each exclusion uses a reviewed category, and the MCP loader catalog is
generated only from entries explicitly marked for inclusion. Completeness tests
compare the manifest, concrete routes, generated catalog, and registered tools.

REST handlers parse HTTP transport values and invoke the executor. MCP tools
parse protocol input and invoke the same executor. Expected failures retain the
API error code, message, and safe details. Unexpected failures become a generic
internal error.

## Security And Operations

- Host and Origin are parsed safely and checked against configured deployment
  allowlists before bearer authentication, database access, rate limiting,
  token-use updates, or catalog loading. Malformed and disallowed values fail
  closed with a sanitized client error.
- `MCP_RATE_LIMITER` enforces 120 envelope requests per manual credential or
  OAuth user/client pair per 60 seconds; operation-specific limits still apply.
- Tool lists are filtered by current coarse capabilities. Each call reruns all
  exact event, team, assignment, consent, and lifecycle guards.
- Manual-token `lastUsedAt` writes are coalesced so ordinary traffic does not
  write on every call.
- Every mutation attempt writes the authentication method, a safe token ID or
  OAuth client reference, tool name, outcome, and timestamp to audit storage.
  Tool inputs, request bodies, OAuth credentials, authorization codes, refresh
  tokens, manual credentials, hashes, and secrets are never logged or audited.
- Observability may record HTTP status, sanitized error code, operation ID,
  latency, and rate-limit outcomes only.

The supported server stack pins `agents@0.20.1` and
`@modelcontextprotocol/server@2.0.0`. The `/mcp` endpoint uses
`createMcpHandler` from `agents/mcp/server`, negotiates MCP 2026-07-28, and
creates a fresh stateless server for every request. Auth0 OAuth and optional
30-day manual tokens are supported. Permanent credentials, ChatGPT web-plugin
submission, legacy SSE, and protocol-session storage are not part of the
platform.
