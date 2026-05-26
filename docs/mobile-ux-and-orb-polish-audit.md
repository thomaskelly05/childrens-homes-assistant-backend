# Mobile UX and ORB polish audit

## Mobile OS issues found (before)

- Desktop operational top bar, full-width command search, notifications and profile crowded the mobile header.
- Child workspace hero used large avatar, huge title and overlay-style quick actions.
- Horizontal child tabs and breadcrumbs stacked under the header without scroll snap.
- `MobileNav` rendered floating quick-action pills above the bottom bar, overlapping content.
- Bottom navigation sat above content without consistent safe-area padding.
- Right-column ORB rail duplicated assistant entry points on small screens.
- Recording editor showed full-height coach beside the form on narrow viewports.

## ORB issues found (before)

- Standalone `/orb` rendered `OrbCompactCompanion` floating FAB over the sticky composer, blocking send on mobile Safari.
- Standalone layout had excess empty space above the message thread.
- Operational `/assistant/orb` composer was not sticky with safe-area padding on mobile.
- Floating `OrbButton` on OS pages could overlap bottom nav and form actions.

## Desktop boundaries (unchanged)

- Left sidebar navigation remains `lg:` and above.
- Two-column workspace + right contextual rail remain at `2xl` / `xl` breakpoints.
- Desktop operational top bar, breadcrumbs and command search unchanged at `lg+`.
- Product split: OS uses `/assistant/orb`; standalone uses `/orb` only.

## Fixes applied

- `MobileOsTopBar`, `MobileScopeHeader`, `MobileBottomNav` for scoped mobile shell.
- Compact child/home heroes; grid hero actions; mobile “Ask ORB” compact rail button.
- Hidden page ORB rails on mobile; bottom nav with safe-area padding; route-based nav hiding on ORB/recording routes.
- Standalone ORB: floating voice companion hidden below `md`; mic in composer only on mobile.
- `orb-floating-dock` pointer-events pattern; recording coach mobile accordion.
- Operational ORB: sticky composer, scope chip, back link, disclaimer.

## Remaining limitations

- Mobile menu uses a slide-over rather than full native drawer animations.
- Operational ORB mode chips still scroll horizontally on very small screens.
- Visual QA on physical iPhone Safari recommended for final spacing tuning.
