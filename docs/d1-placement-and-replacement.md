# D1 placement and recoverable replacement

Remote deployment requires an explicit D1 placement contract. The deployment
workflow never relies on Cloudflare's automatic creation location and never
changes the placement of an existing database.

## Placement contract

Set exactly one of these operator-owned variables in each deployment
environment:

| Variable | Allowed values | Meaning |
| --- | --- | --- |
| `CF_D1_JURISDICTION` | `eu`, `fedramp` | Restricts where the database runs and stores data. |
| `CF_D1_PRIMARY_LOCATION_HINT` | `weur`, `eeur`, `apac`, `oc`, `wnam`, `enam` | Requests a primary location for a database without a jurisdiction restriction. |

The variables are mutually exclusive. Cloudflare gives jurisdiction precedence
and ignores a location hint when both are supplied, so the deployment tooling
rejects that configuration instead of accepting an ambiguous contract. It also
rejects a missing or unsupported value.

The repository's production and test environments use equivalent EU placement:
set `CF_D1_JURISDICTION=eu` in both environments and leave
`CF_D1_PRIMARY_LOCATION_HINT` unset. A self-hosted operator may choose either
contract for each environment according to its data-locality and latency
requirements; no location is derived from a Codex resource name.

When a database already exists, provisioning runs `wrangler d1 info --json`
and checks the observed jurisdiction or running region against the configured
contract. A missing or conflicting observation fails the deployment with
replacement guidance. The check does not delete, update, or silently replace
the existing database. The provisioning result reports the observed
jurisdiction, running region, and read-replication mode for latency evidence.

The location hint is a creation hint, not a guarantee. The deployment accepts
it only when the actual inspected running region matches; otherwise use the
recoverable replacement procedure below.

## Recoverable test replacement procedure

Use this procedure when a test database was created with the wrong placement.
It is an operator-run change window. Freeze writes first and keep the source
database available as the rollback target until the replacement has passed
verification and the agreed rollback window is complete.

1. Record both database identities and export the source to a protected
   recovery path. The source is never used as a restore target:

   ```bash
   export SOURCE_DB='current-test-database'
   export SOURCE_ID='source-uuid-from-d1-info'
   export REPLACEMENT_DB='correctly-placed-test-database'
   export REPLACEMENT_ID='replacement-uuid-from-d1-create'
   export BACKUP_FILE="/secure/path/${SOURCE_DB}-$(date +%Y%m%d%H%M%S).sql"

   bunx wrangler d1 info "$SOURCE_DB" --json
   bunx wrangler d1 export "$SOURCE_DB" --remote --output "$BACKUP_FILE" --yes
   shasum -a 256 "$BACKUP_FILE"
   ```

   Do not put the export, credentials, or database contents in Git.

2. Create and inspect the replacement with exactly one explicit placement
   selector:

   ```bash
   bunx wrangler d1 create "$REPLACEMENT_DB" --jurisdiction=eu
   # or, when using a location contract:
   bunx wrangler d1 create "$REPLACEMENT_DB" --location=eeur
   bunx wrangler d1 info "$REPLACEMENT_DB" --json
   ```

   Record the returned replacement UUID and stop if the observed jurisdiction
   or running region does not satisfy the selected contract.

3. Run the checked-in restore tool without `--apply` and review its table order,
   columns, dependencies, and row counts:

   ```bash
   bun tools/deploy/restore-d1-replacement.ts \
     --source "$SOURCE_DB" --source-id "$SOURCE_ID" \
     --replacement "$REPLACEMENT_DB" --replacement-id "$REPLACEMENT_ID" \
     --export "$BACKUP_FILE" --config wrangler.jsonc --jurisdiction eu
   ```

   The tool ingests the trusted full export locally with SQLite foreign-key
   enforcement disabled, introspects `sqlite_schema` and PRAGMA metadata, and
   emits deterministic `INSERT OR IGNORE` rows in dependency order. Cycles are
   replayed in one transaction with deferred foreign keys. Trigger-created
   primary identities are tolerated while every explicit secondary identity is
   retained.

4. After reviewing the dry-run output, repeat the command with `--apply`. The
   tool re-exports the source, verifies its identity and migration ledger, and
   generates a temporary config next to the supplied config. That temporary
   config contains exactly one D1 binding pinned to `REPLACEMENT_ID`, including
   the configured `migrations_dir`; migrations and every replacement command
   use that file. If the base config is not JSON-compatible, provide
   `--replacement-config PATH` for an already-generated config with exactly the
   same replacement name and UUID. The base config is never edited.

   Remote count requests are independent and contain at most four tables each:
   source counts, post-migration empty counts, and post-replay replacement
   counts. The tool also checks migration state, replacement name/UUID,
   observed placement, positive database size, foreign-key integrity, and
   `quick_check`.

   After replay it exports the replacement and loads both exports locally with
   SQLite. A SHA-256 digest over canonical table names, columns, dependencies,
   and SQLite-quoted rows must match. This is the exact row comparison; it does
   not generate one SQL predicate per source row.

5. Only a successful result with `bindingSwitchPermitted: true` permits a
   separate, explicitly approved binding/configuration change and test deploy.
   Confirm the deployed Worker reports the replacement UUID and expected
   placement before reopening writes. The restore tool never switches bindings,
   deploys, deletes, or modifies the source.

6. If any check fails, leave the source binding in place and keep the
   replacement quarantined for inspection. Rollback is therefore a binding
   decision, not a source-database mutation. Decommissioning either database is
   a separate, explicitly approved operator action after the rollback window.

## Representative latency evidence

Record placement metadata with each deployed latency comparison:

- Worker colo from the response/request trace;
- D1 running region from the D1 response metadata or provisioning inspection;
- D1 read-replication mode;
- consistency mode, such as `first-primary` or a bookmark-anchored session;
- the page phase timings and wall-clock budget measured in a real browser.

Do not compare page timings from different placement or replication contracts
as if they were the same deployment. Restore tests use mocked command runners
and local SQLite fixtures only; they do not create, delete, import, or migrate
remote databases.
