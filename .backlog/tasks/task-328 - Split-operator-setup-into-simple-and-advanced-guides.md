---
id: TASK-328
title: Split operator setup into simple and advanced guides
status: Done
assignee:
  - Codex
created_date: '2026-05-30 13:46'
updated_date: '2026-05-30 13:51'
labels:
  - docs
  - operator-setup
dependencies: []
modified_files:
  - OPERATOR.md
  - OPERATOR-ADVANCED.md
  - README.md
priority: medium
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the first-run operator setup guide easy to follow by keeping OPERATOR.md focused on the minimum GitHub, Auth0, and Cloudflare settings required to deploy a site. Move fine-grained deployment/resource override variables and optional runtime tuning into a separate advanced operator reference linked from the simple guide.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 OPERATOR.md presents a minimal first-run production setup path without exhaustive fine-grained environment-variable override tables.
- [x] #2 OPERATOR-ADVANCED.md documents advanced deployment defaults, resource-name overrides, runtime tuning variables, optional dev/BDD setup, and operational details moved out of the simple guide.
- [x] #3 OPERATOR.md links to OPERATOR-ADVANCED.md where operators need customization beyond the default deployment path.
- [x] #4 README.md points operators to the simple guide and advanced reference without reintroducing exhaustive variable lists.
- [x] #5 Documentation validation runs successfully for the changed files.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review the existing operator, README, and deployment docs to identify first-run content versus advanced override/reference content.
2. Keep OPERATOR.md as the simple production setup path: prerequisites, essential Cloudflare/Auth0/GitHub values, deploy, legal/admin setup, verification.
3. Create OPERATOR-ADVANCED.md for customization: derived resource defaults, override variables, dev/BDD environments, optional Luma/CDN/display settings, and queue-consumer operational details.
4. Update README.md to link both operator docs.
5. Run documentation validation and required repo checks before finalizing, committing, and pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the operator documentation split. OPERATOR.md now keeps the first-run production path focused on required default resources, required production GitHub variables/secrets, deploy, legal setup, admin bootstrap, and verification. OPERATOR-ADVANCED.md now holds deployment defaults, resource override variables, runtime tuning, shared dev, BDD, manual deploy, and queue consumer reconciliation details. Validation passed: git diff --check, bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Simplified OPERATOR.md around the default production setup path and removed the exhaustive optional override tables from the first-run guide.
- Added OPERATOR-ADVANCED.md for deployment defaults, resource-name overrides, runtime tuning, shared dev, BDD, manual deploy commands, and Queue consumer reconciliation details.
- Updated README.md to point operators to the simple guide first and the advanced reference only for customization.

Validation:
- git diff --check
- bun run lint
- bun run typecheck
- bun run test:unit

Risks and follow-ups:
- No runtime behavior changed. The split keeps required production setup in OPERATOR.md and moves customization details to OPERATOR-ADVANCED.md.
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
