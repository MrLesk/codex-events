# AGENTS.md

This repository is the canonical design and implementation workspace for the Codex hackathon platform.

## Project Context

- The platform is used by the Codex Community team to manage multiple hackathons in parallel.
- The product is still being designed. Existing starter-template code is not authoritative for product behavior.
- The `docs/` directory is the source of truth for product rules, domain definitions, workflows, and constraints.

## Canonical Documentation

Read these first before making product decisions:

- [docs/README.md](docs/README.md): documentation index and writing rules
- [docs/domain-model.md](docs/domain-model.md): current domain language, entities, and invariants

When adding new docs, place them in `docs/` and link them from `docs/README.md`.

## Root Repository Docs

- The root `README.md` is public-facing documentation for people evaluating, cloning, configuring, and running `codex-hackathons` on their own Cloudflare instances.
- Write the root `README.md` from the point of view of an operator or adopter of the platform, not from the point of view of a contributor to this repository.
- The root `README.md` should focus on platform capabilities, deployment/runtime configuration, and links to canonical product docs.
- Contributor workflow, local setup, validation commands, and test-running instructions belong in `DEVELOPMENT.md`, not in the root `README.md`.

## Design Reference

- The `Figma-Design/` directory contains design reference material exported as React components and related assets.
- `Figma-Design/` is a visual and design-system guide, not a canonical source of product behavior, data rules, permissions, or workflows.
- Components in `Figma-Design/` must not be used as-is when they conflict with the canonical docs in `docs/`.
- Treat `docs/` as authoritative for product rules and use `Figma-Design/` to inform layout, styling, and interaction design.

## Authoring Rules

- Write documentation as the current canonical state of the product.
- Do not narrate previous versions of the spec.
- Do not explain how the team arrived at the current model unless explicitly asked.
- Do not preserve obsolete concepts for backward compatibility.
- Do not introduce backward-compatibility constraints unless the user explicitly requests them.
- Prefer clear first-read explanations for someone learning the system today.
- If code and docs disagree during this design phase, treat the docs as authoritative and flag the mismatch.
- Do not add roadmap, planned-work, "current direction", or conversation-specific sections to canonical docs unless the user explicitly asks for them.
- Do not include speculative future documents, future phases, or placeholders for work that is not yet canonically defined.
- If something is not current truth, either omit it or record it explicitly as an unresolved question in the appropriate canonical document.
- Do not document naming debates, rejected alternatives, or authoring heuristics inside canonical product docs.
- Do not include rationale that only explains why one wording or model was chosen over another unless that rationale is itself part of the product rules.
- Do not describe canonical decisions in contrast to the current repository starter code or existing local setup.
- Do not include optional alternatives in canonical docs unless those alternatives are themselves part of the supported product architecture.
- Do not add sections such as "current position" or language such as "for the first version" unless the user explicitly asks for phased planning.

## Compatibility Policy (Strict)

- Do not add backward-compatibility behavior unless the user explicitly requests it.
- Do not add compatibility fallbacks, dual-read paths, or dual-write paths to support legacy shapes by default.
- Do not preserve legacy adapters, shims, or migration glue in runtime code "just in case".
- When replacing a model or contract, update callers to the new canonical shape directly instead of introducing temporary fallback logic.
- If migration is required, use an explicit data migration/backfill plan rather than runtime fallback behavior.

## Working Style

- Keep domain language stable and intentional.
- Assume high concurrency in this repository. Other agents or collaborators may be editing nearby files at the same time.
- Do not stop work just because you notice unrelated or unexpected changes in the worktree. Expect parallel work by default and continue unless those changes directly block the task you are doing.
- Inspect the worktree before staging, committing, or reverting anything, and isolate only the files required for your task.
- When parallel work is present, adapt to it. Read carefully, avoid overwriting others, and stage or commit only the changes required for your task.
- Do not overwrite, revert, or "clean up" changes you did not make unless the user explicitly asks you to do so.
- Default git workflow for this repository is to commit directly on `main` and push to `origin/main`.
- Do not create feature branches or PRs unless the user explicitly asks for them.
- Prefer updating existing canonical docs over creating duplicate notes.
- Separate product concepts from storage details when possible.
- Record unresolved product questions explicitly instead of implying false certainty.
- Use current-state language such as "A hackathon has..." rather than "We changed..." or "Previously...".
- Prefer the simplest model that expresses the business rules clearly.
- Prefer proven libraries and existing framework capabilities over writing custom implementations from scratch in most cases.
- Favor booleans, enums, and direct fields over additional entities or abstractions when the extra structure does not provide clear operational value.
- Do not add general-purpose extensibility for hypothetical future needs unless the user explicitly asks for it.
- Optimize for systems that are easy to understand, query, and operate at scale, even when that means rejecting more textbook modeling patterns.
- Reject fallback-based implementations when a direct canonical implementation is possible.
- Do not bloat the code. Every added line must be justified by a concrete requirement in the current task.
- You are penalized for extra lines, branches, helpers, fallbacks, or state that are not strictly necessary to implement the requested behavior safely.
- Do not add defensive UI or runtime fallbacks for states that are already prevented by routing, permissions, or upstream invariants unless the user explicitly asks for them.
- For any code changes, run validation before handoff: at minimum `bun run test:unit` must pass locally. If tests cannot be run, explicitly report that limitation and why.

## Communication Style

- Respond briefly and pragmatically.
- Default to a few sentences, not long explanations.
- Lead with the answer or result.
- Include only the minimum context needed to act safely.
- Expand only when the user explicitly asks for more detail.
- Keep progress updates short and factual.
- When a user gives a non-trivial task, ask focused follow-up questions until you have high confidence in the outcome they actually want, not just the solution they initially proposed.
- Clarify the underlying goal, constraints, and success criteria before implementing when the user's intent could reasonably be interpreted in more than one way.
- If the task is purely mechanical and the intended outcome is already clear, do not ask unnecessary questions.

## User POV For Copy And UX

- When writing product copy, labels, helper text, empty states, or UX flows, write from the point of view of the current product actor:
  - hackathon participant
  - hackathon judge
  - hackathon admin
  - platform admin
- Before proposing or editing copy, identify the actor, what they are trying to do, and what they already know at that moment.
- Prefer the user's mental model over internal implementation language.
- Do not write copy that only makes sense to contributors who have read the docs or know the schema.
- Do not expose backend concepts, internal entities, lifecycle mechanics, or implementation details unless the product explicitly requires them.
- Labels and field descriptions must be understandable on first read by the target actor without extra platform context.
- Helper text should explain only what the actor needs to provide or decide, not what the system is doing internally.
- Button, form, and workflow copy should focus on user intent and outcome, not technical process.
- Avoid overly technical explanations of what happens after an action unless that detail changes the user's decision.
- If a screen or flow is actor-specific, optimize the copy and information hierarchy for that actor rather than for a generic platform operator.
- When uncertain between internal precision and user clarity, prefer user clarity and keep internal precision in code, schema, and admin-only operational docs.
- For any meaningful UX or copy change, explicitly validate:
  - Who is the actor?
  - What is their goal?
  - What terms would they naturally use?
  - What information do they need before acting?
  - What implementation detail can be safely omitted?

<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_backlog_instructions()` to load the tool-oriented overview. Use the `instruction` selector when you need `task-creation`, `task-execution`, or `task-finalization`.
- When committing work tied to a Backlog.md task, use this commit message format: `{taskId} - {taskTitle}`.
- Always commit related `.backlog/tasks/task-*.md` files together with the corresponding code/doc changes in the same commit.
- Do not create subtasks under parent tasks that are already `Done` unless the user explicitly requests it.

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and finalization
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->
