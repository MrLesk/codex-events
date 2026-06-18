# AGENTS.md

This repository contains the Codex Events platform. The current root-governed
documentation model keeps canonical product and engineering guidance under
`docs/`, operator deployment guidance in `OPERATOR.md`, contributor setup in
`DEVELOPMENT.md`, and project management in Backlog.md MCP.

## Project Context

- The platform is used by the Codex Community team to manage multiple events
  in parallel.
- The product is still being designed. Existing prototype or starter-template
  code is not authoritative for product behavior.
- The `docs/` directory is the source of truth for product rules, domain
  definitions, workflows, architecture, and constraints.

## Stack Summary

Authoritative details live in [docs/tech-stack.md](docs/tech-stack.md). At a
glance:

- **Application:** Nuxt web application with shadcn-vue component primitives
  and Tailwind CSS styling.
- **Contracts and data access:** Zod for validation and Drizzle ORM for
  database schema management and queries.
- **Validation:** Vitest for unit and integration tests, Playwright for
  end-to-end tests.
- **Runtime:** Cloudflare Workers for application hosting and server-side
  execution.
- **Data and storage:** Cloudflare D1 as the primary relational database,
  Cloudflare R2 for file storage, and Cloudflare Images bindings for protected
  preview transformations.
- **Async and scheduled work:** Cloudflare Queues, Cloudflare Cron Triggers,
  and Cloudflare Email Service.
- **Identity:** Auth0 handles authentication and identity; the platform data
  model owns authorization.

When stack decisions change, update `docs/tech-stack.md` first and treat it as
authoritative.

## Canonical Documentation

Read these before making product or architecture decisions:

- [docs/README.md](docs/README.md): documentation index and writing rules.
- [docs/domain-model.md](docs/domain-model.md): domain language, entities, and
  invariants.
- [docs/lifecycle-and-state-machines.md](docs/lifecycle-and-state-machines.md):
  event, application, team, submission, judging, winner, and redemption
  lifecycles.
- [docs/permissions-matrix.md](docs/permissions-matrix.md): actor
  permissions, visibility rules, and state-based action constraints.
- [docs/schema-outline.md](docs/schema-outline.md): canonical fields, enums,
  constraints, and relationships.
- [docs/api-surface.md](docs/api-surface.md): API domains, operations,
  contract conventions, and validation expectations.
- [docs/tech-stack.md](docs/tech-stack.md): application stack and
  infrastructure choices.
- [docs/testing-strategy.md](docs/testing-strategy.md): validation layers,
  Auth0-backed end-to-end strategy, and fixture rules.

If code and docs disagree during this design phase, treat the docs as the
current source of truth and flag the mismatch.

## Root-Owned Workflow

- Keep agent and CI instructions at the repository root.
- Do not add nested `AGENTS.md` files or nested GitHub workflow files under
  application directories.
- The root `README.md` is public-facing documentation for people evaluating,
  cloning, configuring, and running `codex-events` on their own Cloudflare
  instances.
- Write the root `README.md` from the point of view of an operator or adopter
  of the platform, not from the point of view of a contributor to this
  repository.
- The root `README.md` should focus on platform capabilities,
  deployment/runtime configuration, and links to canonical product docs.
- Production deployment variables, runtime configuration, and operator setup
  belong in `OPERATOR.md`.
- Contributor workflow, local setup, validation commands, and test-running
  instructions belong in `DEVELOPMENT.md`, not in the root `README.md`.
- When adding new canonical docs, place them in `docs/` and link them from
  `docs/README.md`.
- Prefer updating existing canonical docs over creating duplicate notes.
- Write documentation as the current product truth, not as change history.
- Record unresolved product questions explicitly instead of implying certainty.

## Package Scripts

- Treat root `package.json` scripts as developer-facing and automation-facing
  entrypoints.
- Keep a script in `package.json` only when a contributor, CI workflow, or
  deployment workflow needs it for local development, local validation,
  troubleshooting, or a checked-in operational process.
- Do not add one-off, personal, or environment-specific commands to
  `package.json` when they are better expressed as documented shell commands or
  CI workflow steps.
- Put remote database migrations, remote storage setup, deployments, queue
  reconciliation, Auth0 automation, and similar environment-specific operations
  in checked-in tools plus the root CI workflows or deployment automation that
  owns those environments.

## Authoring Rules

- Write documentation as the current canonical state of the product.
- Do not narrate previous versions of the spec.
- Do not explain how the team arrived at the current model unless explicitly
  asked.
- Do not preserve obsolete concepts for backward compatibility.
- Do not introduce backward-compatibility constraints unless the user explicitly
  requests them.
- Prefer clear first-read explanations for someone learning the system today.
- If code and docs disagree during this design phase, treat the docs as
  authoritative and flag the mismatch.
- Do not add roadmap, planned-work, "current direction", or
  conversation-specific sections to canonical docs unless the user explicitly
  asks for them.
- Do not include speculative future documents, future phases, or placeholders
  for work that is not yet canonically defined.
- If something is not current truth, either omit it or record it explicitly as
  an unresolved question in the appropriate canonical document.
- Do not document naming debates, rejected alternatives, or authoring heuristics
  inside canonical product docs.
- Do not include rationale that only explains why one wording or model was
  chosen over another unless that rationale is itself part of the product rules.
- Do not describe canonical decisions in contrast to prototype code or existing
  local setup.
- Do not include optional alternatives in canonical docs unless those
  alternatives are themselves part of the supported product architecture.
- Do not add sections such as "current position" or language such as "for the
  first version" unless the user explicitly asks for phased planning.

## Compatibility Policy (Strict)

- Do not add backward-compatibility behavior unless the user explicitly requests
  it.
- Do not add compatibility fallbacks, dual-read paths, or dual-write paths to
  support legacy shapes by default.
- Do not preserve legacy adapters, shims, or migration glue in runtime code
  "just in case".
- When replacing a model or contract, update callers to the new canonical shape
  directly instead of introducing temporary fallback logic.
- If migration is required, use an explicit data migration or backfill plan
  rather than runtime fallback behavior.

## Platform Guardrails

- Auth0 is responsible for authentication and identity. Application
  authorization remains in the platform database through platform roles, event
  roles, team roles, approvals, and related business rules.
- Cloudflare D1 is the primary relational database. Do not introduce a second
  persistence model for canonical platform data unless the canonical docs change
  first.
- Cloudflare R2 and Cloudflare Images handle file storage and protected preview
  transformations. Keep stored originals and derived previews conceptually
  separate.
- Cloudflare Queues own asynchronous email and integration work. Do not make
  user-facing request paths depend on best-effort external sync completing
  inline unless the docs explicitly require it.
- Legal settings and platform document content are deployment-owned. Public
  legal pages and account registration should require configured legal content
  rather than falling back to repository-owned operator details.
- Luma is an optional event integration for guest verification,
  approval/rejection sync, and attendance webhooks. Core event participation
  should remain understandable without exposing Luma mechanics to participants.

## Database Query Guardrails

- Runtime database queries in `server/` and `app/` must not use SQL
  `WHERE IN` or Drizzle `inArray`.
- Use joins, `exists`-style predicates, direct equality predicates, or explicit
  per-row point operations instead.
- For small fixed enum filters, use explicit `or(eq(...), eq(...))`
  predicates.
- Tests may use `inArray` when useful, but runtime source must not import it.

## Interface Component Ownership

Prevent component entropy by reusing the existing interface system before
creating new Vue components.

- Before creating any component, search `app/components/`, the target route,
  and the nearest domain directory for an existing visual or behavioral analog.
  Identify the closest analog and prefer adapting that pattern.
- Generated `shadcn-vue` primitives under `app/components/ui/` are the
  primitive layer. They are not app-level components to copy from in feature
  work. Use them directly only when extending primitives or maintaining the
  App wrapper layer.
- Root `App*` components under `app/components/` are shared interface
  primitives for application styling, controls, icons, layout, and feedback.
  Feature work should use these wrappers before importing generated primitives.
- Domain and shared components under directories such as `admin`, `events`,
  `public/events`, `account`, `applications`, `judging`, `shell`, and `teams`
  are the next reuse layer. Reuse or extend them before creating another domain
  panel, card, row, form, or status presentation.
- Large page and panel components should compose existing App and domain
  components. They must not invent local row, card, filter, roster, editor,
  or form patterns when a shared pattern already exists.
- Create a new component only when the closest existing component cannot express
  the current behavior through props, slots, composition, or a focused
  extension. Document the closest existing analog and why extension is not
  enough in the Backlog task or implementation notes.

## Working Style

- Keep domain language stable and intentional.
- Assume high concurrency in this repository. Other agents or collaborators may
  be editing nearby files at the same time.
- Do not stop work just because you notice unrelated or unexpected changes in
  the worktree. Expect parallel work by default and continue unless those
  changes directly block the task you are doing.
- Inspect the worktree before staging, committing, pushing, or reverting
  anything, and isolate only the files required for your task.
- When parallel work is present, adapt to it. Read carefully, avoid overwriting
  others, and stage or commit only the changes required for your task.
- Do not overwrite, revert, or "clean up" changes you did not make unless the
  user explicitly asks you to do so.
- Default git workflow for this repository is to commit directly on `main` and
  push to `origin/main`.
- When a user-requested change is complete, commit and push it unless the user
  explicitly asks not to.
- Do not create feature branches or PRs unless the user explicitly asks for
  them.
- When creating a GitHub Release, do not manually update `package.json` or
  create a local version-bump commit first. The production release workflow
  derives the package version from the published release tag, writes
  `package.json`, and commits that version sync back to `main` automatically.
  Check `.github/workflows/deploy-production.yml` before changing release
  automation behavior.
- Separate product concepts from storage details when possible.
- Record unresolved product questions explicitly instead of implying false
  certainty.
- Use current-state language such as "A hackathon has..." rather than "We
  changed..." or "Previously...".
- Prefer the simplest model that expresses the business rules clearly.
- Prefer proven libraries and existing framework capabilities over writing
  custom implementations from scratch in most cases.
- Favor booleans, enums, and direct fields over additional entities or
  abstractions when the extra structure does not provide clear operational
  value.
- Do not add general-purpose extensibility for hypothetical future needs unless
  the user explicitly asks for it.
- Optimize for systems that are easy to understand, query, and operate at scale,
  even when that means rejecting more textbook modeling patterns.
- Reject fallback-based implementations when a direct canonical implementation
  is possible.
- Do not bloat the code. Every added line must be justified by a concrete
  requirement in the current task.
- You are penalized for extra lines, branches, helpers, fallbacks, or state that
  are not strictly necessary to implement the requested behavior safely.
- Do not add defensive UI or runtime fallbacks for states that are already
  prevented by routing, permissions, or upstream invariants unless the user
  explicitly asks for them.

## Codex Events Validation

For any code changes, run validation before handoff and before committing:

- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Run `bun run test:integration` and `bun run test:bdd` when the change touches
server integrations, Auth0-backed flows, browser workflows, or other behavior
covered by those suites.

For docs-only changes, run `git diff --check`. Report any validation command
that cannot be run and why.

## Collaboration Style

Work with the user like a teammate, not a fully delegated contractor.

Default behavior:

- Treat user requests as the start of a collaboration, not automatic permission
  to run to completion.
- Do not turn collaboration into a ritual checklist. Restate goals,
  assumptions, ambiguities, or questions only when they materially affect
  implementation.
- If the task is mechanical, local, reversible, and unambiguous, proceed
  directly.
- If ambiguity could change product behavior, scope, architecture, naming, or
  tradeoffs, pause and collaborate before implementing.
- When you pause, separate clearly what is certain, what you are inferring, and
  what you need from the user.
- If there are multiple reasonable interpretations or tradeoffs, present them
  briefly before choosing.
- If you think the request is pointing at the wrong solution, say so directly
  and explain the better framing.
- Do not silently make product or architectural decisions just to keep momentum.

Rule of thumb:

- If a human teammate would normally just make the edit, do it.
- If a human teammate would normally pause to confirm because the choice affects
  behavior or direction, pause and confirm.

## Communication Style

- Respond briefly and pragmatically.
- Default to a few sentences, not long explanations.
- Lead with the answer or result.
- Include only the minimum context needed to act safely.
- Expand only when the user explicitly asks for more detail.
- Keep progress updates short and factual.
- When a user gives a non-trivial task, ask focused follow-up questions until
  you have high confidence in the outcome they actually want, not just the
  solution they initially proposed.
- Clarify the underlying goal, constraints, and success criteria before
  implementing when the user's intent could reasonably be interpreted in more
  than one way.
- If the task is purely mechanical and the intended outcome is already clear,
  do not ask unnecessary questions.

## User POV For Copy And UX

- When writing product copy, labels, helper text, empty states, or UX flows,
  write from the point of view of the current product actor:
  - event participant
  - hackathon participant
  - hackathon judge
  - event staff
  - event admin
  - platform admin
- Before proposing or editing copy, identify the actor, what they are trying to
  do, and what they already know at that moment.
- Prefer the user's mental model over internal implementation language.
- Do not write copy that only makes sense to contributors who have read the docs
  or know the schema.
- Do not expose backend concepts, internal entities, lifecycle mechanics, Auth0,
  database details, queue mechanics, or implementation details unless the
  product explicitly requires them.
- Labels and field descriptions must be understandable on first read by the
  target actor without extra platform context.
- Helper text should explain only what the actor needs to provide or decide, not
  what the system is doing internally.
- Button, form, and workflow copy should focus on user intent and outcome, not
  technical process.
- Avoid overly technical explanations of what happens after an action unless
  that detail changes the user's decision.
- If a screen or flow is actor-specific, optimize the copy and information
  hierarchy for that actor rather than for a generic platform operator.
- When uncertain between internal precision and user clarity, prefer user
  clarity and keep internal precision in code, schema, and admin-only
  operational docs.
- For dashboard and admin UI, default to one visual container depth per section.
  Do not place bordered cards, inset panels, or similar surfaces inside another
  card unless the nested surface is a truly separate workflow or tool.
- Inside an existing card, create hierarchy with spacing, columns, headings, and
  dividers before introducing another bordered box.
- If nested surfaces appear necessary, pause and justify that choice explicitly
  instead of making it the default.
- For any meaningful UX or copy change, explicitly validate:
  - Who is the actor?
  - What is their goal?
  - What terms would they naturally use?
  - What information do they need before acting?
  - What implementation detail can be safely omitted?

## Audience Translation Rule

Keep private reasoning separate from visible output.

Before writing or editing any user-facing copy, UI label, heading, empty state,
README section, landing-page text, or canonical documentation, identify two
layers:

- Internal intent: what the team or agent is trying to achieve, prove, model,
  or validate.
- Audience-facing expression: what the target reader or user should actually
  see.

Never publish the internal intent directly unless the audience is explicitly an
internal contributor reading implementation notes.

Examples of internal intent that must usually be translated:

- "external validation"
- "technical credibility"
- "onboarding flow"
- "activation"
- "happy path"
- "edge case"
- "admin lifecycle"
- "canonical state"
- "MVP scope"
- "assumptions"
- "current direction"
- "migration strategy"
- "proof of value"

Translate intent into audience-native language, evidence, actions, or outcomes.
Good visible copy names the thing the user recognizes, the action they can take,
or the outcome they care about. Bad visible copy names the reason the team
wanted the copy to exist.

Before finalizing, scan headings, buttons, helper text, empty states, README
sections, and docs intros. If a phrase sounds like a planning note, product
strategy label, schema concept, or agent reasoning artifact, rewrite it from the
reader's point of view.

Use this test:

- Would the target actor naturally say this phrase?
- Would this phrase make sense without knowing our implementation or planning
  conversation?
- Is this evidence/action/outcome, or is it a label for what we hoped to
  communicate?

For this project, do not expose organizer/platform implementation language to
participants or judges. A participant joins an event, submits a project when
the event is a hackathon, checks requirements, and sees decisions or results. A
judge reviews assigned submissions using visible criteria. They do not need to
see concepts like lifecycle state, canonical workflow, review pipeline, queue
delivery, or internal scoring model unless those concepts are part of the
visible rules.

When in doubt, keep the precise internal term in code, schema, specs, or task
notes, and use audience-native wording in the visible surface.

<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to
  understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call
  `backlog.get_backlog_instructions()` to load the tool-oriented overview. Use
  the `instruction` selector when you need `task-creation`, `task-execution`,
  or `task-finalization`.
- When committing work tied to a Backlog.md task, use this commit message
  format: `{taskId} - {taskTitle}`.
- Always commit related `.backlog/tasks/task-*.md` files together with the
  corresponding code/doc changes in the same commit.
- If finalizing a task moves or updates files under `.backlog/completed/`,
  commit those Backlog.md changes with the same task commit.
- Do not leave Backlog.md task updates uncommitted or unpushed.
- Do not create subtasks under parent tasks that are already `Done` unless the
  user explicitly requests it.

- **First time working here?** Read the overview resource IMMEDIATELY to learn
  the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to
  track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and finalization
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The
information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->
