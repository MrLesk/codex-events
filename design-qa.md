# CFP design QA

- Source visual truth: `/var/folders/fd/cgvn5zh52tb_sbt7hp_vtbmm0000gn/T/codex-clipboard-0ea15f97-bcd3-4069-8510-5f0d6fce478c.png` (temporary attachment path; no longer available at final comparison time)
- Implementation screenshot: `/private/tmp/codex-events-cfp-review-viewport.png`
- Viewport: 1280 × 720 CSS pixels
- Source pixels: displayed as 427 × 96 in the request; the original file could not be reopened to confirm density
- Implementation pixels: 1280 × 720 at the browser's default device density
- State: dark theme, event-admin Call for talks tab, no proposals, Status set to All

## Full-view comparison evidence

The browser-rendered implementation was captured successfully. The temporary source attachment expired before it could be placed beside the implementation in the required combined comparison input, so a strict full-view fidelity comparison could not be completed.

## Focused region comparison evidence

The rendered Status label and compact shared select were inspected in the live browser. The select exposes the expected All, Draft, Submitted, Withdrawn, Accepted, and Not accepted options, and changing the selection works. A valid source-and-implementation focused comparison could not be produced after the source path expired.

## Findings

- No browser-rendered P0, P1, or P2 issue was found in the implemented CFP controls.
- Strict reference fidelity remains unverified because the temporary source image is unavailable.

## Comparison history

- Initial browser pass found that saved custom questions disappeared from the settings UI after the page-shaped settings response was applied.
- The settings contract was updated to retain the question definitions and revision.
- A revised browser pass confirmed that the persisted organizer question row remains visible after reload.

## Primary interactions tested

- Enabled a Meetup Call for talks.
- Added and saved a required short-text question.
- Reloaded settings and confirmed the saved question remains visible.
- Opened the staff Call for talks review tab.
- Changed the Status filter from All to Submitted.

## Console errors checked

No CFP-specific browser error was observed. Existing Vue `toRefs()` warnings originate outside the CFP components.

final result: blocked

Blocker: the temporary source attachment expired before the required combined visual comparison could be performed.
