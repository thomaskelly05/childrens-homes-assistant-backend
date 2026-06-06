# ORB Mobile Login Layout

## Goals

- Fit iPhone Safari/Chrome/Firefox without clipping behind browser chrome
- Keep premium desktop two-column layout unchanged
- Readable disabled OAuth states

## Techniques

| Concern | Implementation |
|---------|----------------|
| Dynamic viewport | `min-h-[100dvh]` + `min-h-[100svh]` fallbacks |
| Safe areas | `env(safe-area-inset-top/bottom)` on root + footer |
| Scroll | `.orb-login-root { overflow-y: auto }` on mobile |
| Sphere size | `scale-[0.62]` mobile hero, max-height cap in CSS |
| Button height | `min-h-[2.75rem]` auth buttons, `py-2.5` on mobile |
| Bottom toolbar | `padding-bottom: max(1.5rem, safe-area-inset-bottom)` on shell |
| Compact screens | Passkey section collapsible below 720px height |
| Disabled OAuth | `orb-auth-button--disabled` higher contrast; "sign-in unavailable" copy |

## Files

- `components/orb-residential/orb-login-screen.tsx`
- `app/orb/orb-login-center.css`
- `components/orb-residential/ui/orb-auth-button.tsx`

## Remaining limitations

- Very small landscape phones may still need scroll to reach footer legal links (by design — scroll preferred over clipping).
