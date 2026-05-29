---
id: TASK-327
title: Refresh repository agent instructions
status: Done
assignee:
  - Codex
created_date: '2026-05-29 21:38'
updated_date: '2026-05-29 21:44'
labels: []
dependencies: []
references:
  - /Users/alex/projects/mise/AGENTS.md
  - /Users/alex/projects/block-and-horde/AGENTS.md
modified_files:
  - AGENTS.md
priority: medium
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update this repository's `AGENTS.md` so it follows the newer instruction structure used by the sibling `mise` and `block-and-horde` projects while preserving Codex Events-specific project context, documentation rules, validation requirements, and Backlog workflow guidance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `AGENTS.md` adopts the newer sibling-project instruction structure where it improves clarity and agent behavior.
- [x] #2 Project-specific facts remain accurate for Codex Events, including source-of-truth docs, operator docs, compatibility policy, validation commands, and default git workflow.
- [x] #3 Instructions that are specific to `mise` or `block-and-horde` are translated or omitted rather than copied incorrectly.
- [x] #4 The resulting file is internally consistent and avoids duplicated or contradictory guidance.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rework the opening/root sections of `AGENTS.md` to follow the newer sibling-project structure while preserving Codex Events context.
2. Add Codex Events-specific root-owned workflow guidance for root docs, `DEVELOPMENT.md`, `OPERATOR.md`, `docs/`, and GitHub workflow placement.
3. Add an adapted package-script boundary section that fits this single-application Cloudflare/Nuxt repository and its existing deployment scripts.
4. Tighten working-style git guidance with inspect-before-push and completed-work commit/push expectations.
5. Add newer Backlog hygiene that task file updates must not be left uncommitted or unpushed.
6. Validate the resulting file for internal consistency and update task acceptance criteria/notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated `AGENTS.md` using the newer sibling-project structure as the pattern: added stack summary, root-owned workflow, package-script boundaries, Codex Events platform guardrails, clearer validation guidance, commit/push expectations, and stronger Backlog hygiene. Verified no sibling-specific terms from `mise` or `block-and-horde` remain. Validation run: `git diff --check` passed; line-length scan found no lines over 100 characters.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated `AGENTS.md` to follow the newer sibling-project instruction structure while translating the content for Codex Events. The file now includes a stack summary, root-owned workflow rules, package-script boundaries, Codex Events platform guardrails, clearer validation guidance, commit/push expectations, updated actor guidance, and stronger Backlog hygiene.

Validation run: `git diff --check` passed. Additional review: line-length scan found no lines over 100 characters, and a sibling-term scan found no `mise` or `block-and-horde`-specific guidance left behind.

Risks/follow-ups: no immediate follow-up work identified; this is an agent-instruction/docs-only change.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
