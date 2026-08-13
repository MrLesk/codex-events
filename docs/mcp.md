# Model Context Protocol

Codex Events exposes structured platform operations through a stateless
Streamable HTTP endpoint at `/mcp`. MCP is a protocol, authentication,
input/output, annotation, and error adapter around the same application
operations used by REST. It does not own authorization, lifecycle rules,
persistence, side effects, domain auditing, or serialization.

## Credentials

Users create named MCP access tokens from account settings through
session-authenticated REST APIs. A credential contains a public token identifier
and high-entropy secret. The full value is shown once. D1 stores only a secure
one-way hash and a safe display prefix. A user can have five active tokens;
creation enforces that limit atomically so concurrent requests cannot exceed
it. Each token expires exactly 30 days after creation and can only be revoked,
not renewed. Account deletion deletes the credentials.

The endpoint rejects absent, malformed, unknown, expired, revoked, or
deleted-owner credentials without distinguishing those states to callers.
Cookies never authenticate `/mcp`. Actor reconstruction loads the token owner,
current platform and event roles, current team and judging relationships, and
current required-document acceptance on every request.

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
- `MCP_RATE_LIMITER` enforces 120 envelope requests per token per 60 seconds;
  operation-specific limits still apply.
- Tool lists are filtered by current coarse capabilities. Each call reruns all
  exact event, team, assignment, consent, and lifecycle guards.
- `lastUsedAt` writes are coalesced so ordinary traffic does not write on every
  call.
- Every mutation attempt writes token ID, tool name, outcome, and timestamp to
  audit storage. Tool inputs, request bodies, credentials, hashes, and secrets
  are never logged or audited.
- Observability may record HTTP status, sanitized error code, operation ID,
  latency, and rate-limit outcomes only.

The supported server stack pins `agents@0.20.0` and
`@modelcontextprotocol/server@2.0.0`. The `/mcp` endpoint uses the stable
`createMcpHandler` exported by `@modelcontextprotocol/server`; the handler is
stateless and does not create protocol sessions. The published Agents wrapper
is not used because that pinned release peers against a prerelease MCP server
protocol. OAuth, scopes, permanent credentials, ChatGPT web-plugin submission,
legacy SSE, and protocol-session storage are not part of the platform.
