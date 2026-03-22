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

## Working Style

- Keep domain language stable and intentional.
- Prefer updating existing canonical docs over creating duplicate notes.
- Separate product concepts from storage details when possible.
- Record unresolved product questions explicitly instead of implying false certainty.
- Use current-state language such as "A hackathon has..." rather than "We changed..." or "Previously...".
- Prefer the simplest model that expresses the business rules clearly.
- Favor booleans, enums, and direct fields over additional entities or abstractions when the extra structure does not provide clear operational value.
- Do not add general-purpose extensibility for hypothetical future needs unless the user explicitly asks for it.
- Optimize for systems that are easy to understand, query, and operate at scale, even when that means rejecting more textbook modeling patterns.
