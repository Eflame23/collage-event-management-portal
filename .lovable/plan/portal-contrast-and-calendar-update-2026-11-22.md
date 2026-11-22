# Portal contrast and calendar update

## User-facing changes
- Add an accessible light/dark switch with warm stone light surfaces and midnight-plum dark surfaces.
- Replace the eight relative-date seed events with the user's exact twelve November–December 2026 events, and harden event-date parsing against invalid and ISO date strings.
- Keep notification bell interactions in a click-outside popover with unread status, category icons, timestamps, and a mark-all-read action.
- Add URL, local upload, and four preset cover choices to the organizer form; use the chosen image for event cards and the calendar drawer.
- Upgrade the calendar with monthly and registration summaries, a next-event countdown, category legend/chip colors, a today highlight, and subtle cell hover motion.

## Implementation
- Preserve `PortalApp` as the single owner of event, pass, and notification state; pass notification actions, theme state, and image-bearing event drafts through existing component props.
- Keep the calendar's month navigation dynamic, while honoring the exact seed-event dates supplied in this request.
- Add regression assertions for all twelve event records, valid date parsing, and image uniqueness; run the relevant tests and inspect the preview diagnostics.