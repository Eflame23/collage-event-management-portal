<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Portal architecture
- The MIT-ADT event portal is pure frontend: all shared state (events, passes, notifications) lives in `src/components/portal/PortalApp.tsx` and flows down as props; registration/cancel logic is pure functions in `portal-logic.ts` so tests can assert seat math without rendering. Why: one state owner keeps seat counts, passes and alerts consistent across all four tabs.
- Tabs are `Discovery & Events`, `Campus Calendar`, `Organizer Hub`, `My Passes & Alerts` (order in `Header.tsx` TABS). Sprint Metrics was removed by user request — never re-add it.
- The Campus Calendar (`CampusCalendar.tsx`) is fully dynamic: never hardcode a month/year. All date logic lives in `data.ts` (`parseEventDate`, `parseEventTime`, `formatEventDate`, `monthGridCells`, `earliestUpcomingEvent`, `isSameDay`) and events map onto day cells by parsing each event's `dateLabel`. Seed events use dates relative to `new Date()` so the calendar always opens on a populated month.
- The gate pass modal prints via `window.print()`; the `.gate-pass-printable` / `.print-hide` classes in `src/styles.css` isolate the pass card for a clean single-page PDF. Keep those class names intact.
