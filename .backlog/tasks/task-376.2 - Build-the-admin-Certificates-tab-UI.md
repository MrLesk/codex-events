---
id: TASK-376.2
title: Build the admin Certificates tab UI
status: Done
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 08:40'
labels:
  - ui
  - admin
  - events
dependencies: []
milestone: m-2
priority: high
parent_task_id: TASK-376
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a Certificates tab to the account event workspace for event admins listing approved participants with their effective attendance and its source (Luma or manual). Admins search by name or email, filter by checked-in or not checked-in, mark participants joined or not joined with toggle semantics, and open the public certificate of joined participants. Rows update in place without losing scroll position.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Certificates tab appears for event admins in the account event workspace for every event type.
- [x] #2 Search plus all / checked-in / not-checked-in filters work over approved participants.
- [x] #3 Joined and not-joined controls reflect the override state, toggle-clear back to the Luma default, and show the attendance source.
- [x] #4 Joined participants expose a link to their public certificate.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The tab loads approved applications through the existing paginated admin list endpoint and updates rows in place from action responses, mirroring the staged-decision merge pattern. A BDD scenario covers the joined toggle round-trip and caught two real integration issues before release: the panel was registered under the wrong auto-generated Lazy component name and initially loaded its roster during SSR instead of in the browser. The full Auth0-backed BDD suite passes with the scenario included; it is also the visual QA path for the tab because local dev sessions cannot impersonate an event admin.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the Certificates workspace tab for event admins with search, all / checked-in / not-checked-in filters, joined and not-joined toggle controls with attendance source labels, a checked-in counter, and public certificate links for joined participants, plus the workspace tab registration, SEO entry, and an Auth0-backed BDD scenario.
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
