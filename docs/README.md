# Documentation

This directory contains the canonical product and engineering documentation for the Codex hackathon platform.

## Rules

- Treat the docs in this directory as the current source of truth.
- Write for a first-time reader who needs to understand the platform as it exists now.
- Do not document the history of how the spec evolved unless explicitly requested.
- Do not carry backward-compatibility assumptions just because an earlier draft said something different.
- Prefer a small number of stable canonical documents over many overlapping notes.

## Documents

- [domain-model.md](domain-model.md): core entities, relationships, permissions, and business invariants
- [lifecycle-and-state-machines.md](lifecycle-and-state-machines.md): lifecycle states, transitions, and transition guards
- [permissions-matrix.md](permissions-matrix.md): actor permissions, visibility rules, and state-based action constraints
- [schema-outline.md](schema-outline.md): canonical entity fields, enums, constraints, and key relationships
