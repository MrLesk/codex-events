---
id: TASK-381
title: Send post-event certificate emails
status: To Do
assignee:
  - '@codex'
created_date: '2026-06-10 07:30'
updated_date: '2026-06-20 16:25'
labels:
  - api
  - email
  - events
milestone: m-2
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When an event completes, checked-in participants receive a thank-you email with a direct link to their participation certificate, reusing the existing outbound email queue infrastructure and ideally combined with the event feedback invitation so participants get one post-event touchpoint.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Completed events enqueue one certificate email per effectively checked-in participant with their certificate link.
- [ ] #2 Email delivery reuses the existing queue and retry infrastructure.
- [ ] #3 Participants who hid their certificate still receive their own link.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
One-off production operation for Codex Build Vienna on 2026-06-20, without implementing the reusable queue feature yet.
1. Confirm production resource names and email sending configuration.
2. Query production D1 for certificate-eligible participants for slug codex-build-vienna-2026-06-20: approved, effectively checked in, active account, certificate not hidden, certificate not revoked, valid email.
3. Generate direct certificate URLs and print recipient count plus redacted samples.
4. After explicit confirmation, send a short thank-you email with the certificate link through Cloudflare Email Sending using a campaign-specific idempotency header.
5. Record attempted/sent/skipped/failed counts in task notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Dry run for codex-build-vienna-2026-06-20: production D1 database codex-hackathons contains the event slug. Approved applications: 119. Certificate-eligible recipients under the current certificate gate: 66. Hidden certificates: 0. Revoked certificates: 0. Active accounts among approved: 119. Public certificate URLs checked: 66/66 returned HTTP 200. Current Cloudflare token can query D1 and list codex-hackathons deployments; Email Sending list/settings checks did not work, but direct Cloudflare Email Sending CLI sends did work.

One-off send completed on 2026-06-20: 66 certificate-eligible recipients queried immediately before send; 66 Cloudflare Email Sending CLI sends accepted; 0 failed; no retry stop was triggered. Subject: Thank you for joining Codex Build Vienna. Body included a personalized first-name greeting, thanks for joining Codex Build Vienna, and the direct public certificate URL. Broader reusable TASK-381 queue acceptance criteria remain unchecked because this was an operator send, not the reusable product implementation.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
One-off operation completed on 2026-06-20: 66 certificate-eligible participants for codex-build-vienna-2026-06-20 were emailed their direct certificate links through Cloudflare Email Sending. The broader reusable queue feature remains open.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done

<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
