## What's Changed

### Features
- Implement configurable judging flow
- Split live pitch from post-pitch judge review
- Make submission required fields configurable per event
- Implement event credits management and redemption
- Add admin-managed participant withdrawal workflow
- Sync Luma attendee check-ins into event attendance
- Add restricted Discord server link to event account page
- Restrict event street address visibility to approved participants and staff roles
- Add teams tab create-team CTA

### UI/UX Improvements
- Replace shortlist custom reorder UI with shared admin reorder pattern
- Refine public and account event tracks presentation
- Expand failed Luma approval recap in participant review
- Align account event Teams tab visibility for staff and admins
- Refine event config form inputs
- Adjust pitch review controls layout

### Bug Fixes
- Fix account event judge assignment detail layout and blind-review action gating
- Fix misleading team approval highlight for unmatched participant groupings
- Fix agenda item layout in details tab
- Fix event tracks panel imports

### Performance
- Reduce CI deploy build memory pressure for Cloudflare deploys

### CI & Tooling
- Clarify agent spawn task finalization rules
- Move collaboration guidance into AGENTS sections
- Update agent spawn notes
