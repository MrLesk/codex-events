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
It is an operator-run change window. The source database remains available for
rollback until verification and the agreed rollback window are complete.

1. Freeze test writes or schedule a maintenance window, record the source
   database identity and placement, and export it without deleting the source:

   ```bash
   export SOURCE_DB='current-test-database'
   export REPLACEMENT_DB='correctly-placed-test-database'
   export BACKUP_FILE="/secure/path/${SOURCE_DB}-$(date +%Y%m%d%H%M%S).sql"

   bunx wrangler d1 info "$SOURCE_DB" --json
   bunx wrangler d1 export "$SOURCE_DB" --remote --output "$BACKUP_FILE"
   shasum -a 256 "$BACKUP_FILE"
   ```

   Store the export and checksum in the operator's protected recovery
   location. Do not put the export, credentials, or database contents in Git.

2. Create a new database with the intended explicit placement. Use exactly one
   of these commands; do not run both:

   ```bash
   bunx wrangler d1 create "$REPLACEMENT_DB" --jurisdiction=eu
   # or:
   bunx wrangler d1 create "$REPLACEMENT_DB" --location=eeur
   ```

   Inspect the replacement and stop if its observed placement is not the
   intended one:

   ```bash
   bunx wrangler d1 info "$REPLACEMENT_DB" --json
   ```

3. Restore the exported schema and data into the replacement, then apply any
   repository migrations required by the selected release:

   ```bash
   bunx wrangler d1 execute "$REPLACEMENT_DB" --remote --file "$BACKUP_FILE"
   bunx wrangler d1 migrations apply "$REPLACEMENT_DB" --remote
   ```

   Verify migration state, representative row counts, authorization rows,
   event data, and the application read paths against the replacement. Repeat
   the checks after a fresh export/import if the first verification is not
   reproducible. Keep the source unchanged while this verification runs.

4. After verification, switch the operator-owned deployment database name (or
   generated binding input) to `REPLACEMENT_DB`, keep the same explicit
   placement variable, and deploy the test environment. Confirm the deployed
   Worker reports the replacement UUID and expected placement before reopening
   writes.

5. If verification or the post-switch smoke test fails, roll back by restoring
   the source database name/binding and redeploying. Do not modify or delete the
   source while it is the rollback target.

6. After the rollback window has expired and a fresh backup and verification
   record are retained, decommission the source as a separate, explicitly
   approved operator action. The deployment tooling does not perform this
   action automatically:

   ```bash
   bunx wrangler d1 delete "$SOURCE_DB"
   ```

## Representative latency evidence

Record placement metadata with each deployed latency comparison:

- Worker colo from the response/request trace;
- D1 running region from the D1 response metadata or provisioning inspection;
- D1 read-replication mode;
- consistency mode, such as `first-primary` or a bookmark-anchored session;
- the page phase timings and wall-clock budget measured in a real browser.

Do not compare page timings from different placement or replication contracts
as if they were the same deployment. Local tests use fake-D1 state and do not
create, delete, import, or migrate remote databases.
