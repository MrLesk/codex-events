# Documentation

This directory contains the canonical product and engineering documentation for the Codex event platform.

## Rules

- Treat the docs in this directory as the current source of truth.
- Write for a first-time reader who needs to understand the platform as it exists now.
- Do not document the history of how the spec evolved unless explicitly requested.
- Do not carry backward-compatibility assumptions just because an earlier draft said something different.
- Prefer a small number of stable canonical documents over many overlapping notes.

## Documents

- [api-surface.md](api-surface.md): canonical backend API domains, operations, contract conventions, and validation expectations
- [database-query-plan-audit.md](database-query-plan-audit.md): measured `EXPLAIN QUERY PLAN` audit for release hot paths on the current migrated SQLite schema
- [domain-model.md](domain-model.md): core entities, relationships, permissions, and business invariants
- [lifecycle-and-state-machines.md](lifecycle-and-state-machines.md): lifecycle states, transitions, and transition guards
- [permissions-matrix.md](permissions-matrix.md): actor permissions, visibility rules, and state-based action constraints
- [schema-outline.md](schema-outline.md): canonical entity fields, enums, constraints, and key relationships
- [tech-stack.md](tech-stack.md): canonical application stack and infrastructure choices
- [testing-strategy.md](testing-strategy.md): canonical testing layers, Auth0-backed E2E strategy, and fixture rules
- [security-analysis.md](security-analysis.md): repository security findings and remediation scope from the 2026-03-30 review
