# ORB Residential Mobile UX Convergence Sprint

Sprint goal: make ORB feel like a **mobile-first residential intelligence companion**, not a desktop application compressed onto a phone.

Scope: mobile UX, layout, navigation, hierarchy and usability only. Intelligence, routes, billing logic and standalone boundaries are unchanged.

Verified viewports: **390×844**, **430×932**, **768×1024**.

---

## Home screen

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| Hero line **Care. Connect. Empower.** | **IndiCare Intelligence** | Communicate function, not marketing | `/orb` empty state |
| Large hero orb with atmosphere cropping at top | Orb fully visible; softer atmosphere behind header band | Fix accidental crop; intentional placement | `/orb` mobile |
| Tall empty-state column; question far from composer | Tighter vertical stack; heading closer to composer | Reduce dead space; immediate task focus | `/orb` mobile |

**Files:** `lib/orb/orb-residential-copy.ts`, `orb-care-companion.tsx`, `app/orb/orb-mobile.css`

---

## Chat

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| Some sessions opened scrolled halfway | `resetOrbChatScrollPosition` on chat switch — top for empty, bottom for threads | Reliable open position | `/orb` chat |
| Mic and Voice inside composer row | **Dictate** and **Voice** quick actions above composer | Primary focus on typing | `/orb` composer |
| Placeholder **Ask anything** | **Ask ORB anything...** | Clear residential assistant intent | `/orb` composer |

**Files:** `lib/orb/orb-scroll.ts`, `orb-standalone-composer.tsx`, `orb-care-companion.tsx`

---

## Dictate

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| Large orb dominated capture screen | Orb ~35% smaller; placed below primary CTA | Recording is the action, not decoration | `?station=orb_dictate` |
| Status below orb | **Ready to record** → **Start recording** → orb accent → paste/upload | Action-first hierarchy | Dictate mobile |

**Files:** `orb-dictate-mobile-experience.tsx`, `app/orb/orb-mobile.css`

---

## ORB Write

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| Full desktop formatting toolbar on phone | Hidden `<768px`; **Format · Insert · Review · More** bottom sheet | Mobile-first editing | `?station=orb_write` |
| No in-context ORB help while editing | Floating **Ask ORB about this document** | Document intelligence without leaving editor | ORB Write mobile |

**Files:** `orb-write-mobile-toolbar.tsx`, `orb-write-editor.tsx`, `orb-write-standalone-panel.tsx`

---

## Recording library (Templates)

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| Many category pills + inline category chips | **All · Popular · Safeguarding · Recording · Inspection · Management** | ≤5 visible filters; category detail inside lists | `?station=templates` |

**Files:** `orb-templates-panel.tsx`, `OrbRecordingLibraryCards.tsx`

---

## Documents

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| Tab row wrapped awkwardly on phone | Horizontally scrollable segmented control; 44px tap targets; active ring | Clear, interactive navigation | `?station=documents` |

**Files:** `orb-premium-tabs.tsx`, `orb-document-panel.tsx`, `app/orb/orb-mobile.css`

---

## Saved outputs

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| **No saved outputs yet** | **Nothing saved yet.** + guidance line | Warmer, purpose-led empty state | `?station=saved` |
| Generic CTAs | **Create document** (primary), **Start in Dictate** (secondary) | Obvious next steps | Saved outputs empty |

**Files:** `orb-saved-outputs-panel.tsx`

---

## Profile panel

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| Noisy status chips and long account summary | Name, email, role; compact **Voice Ready** / **Passkey Enabled** badges | Calm account card | Profile drawer, account menu |
| Strong overlay glow | Reduced profile overlay tint | Less visual noise behind content | Profile drawer |

**Files:** `orb-adult-profile-drawer.tsx`, `orb-account-menu.tsx`, `app/orb/orb-mobile.css`

Account menu primary items: Profile, Settings, Billing, Privacy, Voice, Saved Outputs, Sign Out.

---

## Settings

| Before | After | Reason | Screens |
|--------|-------|--------|---------|
| ChatGPT-style **General · Personalisation · Chat · Skills · Security · Data controls · Billing** | **Appearance · Voice · Recording Preferences · Writing Preferences · Safety & Privacy · Account & Billing · About ORB** | Residential mental model; same controls | Settings panel |

**Files:** `orb-standalone-settings-panel.tsx`

---

## Mobile design rules applied

- Minimum tap target **44px** on primary controls, tabs and filter pills
- **No horizontal page scroll** — segmented tabs scroll inside their row
- **≤5 filter chips** visible on recording library and templates
- ORB Write toolbar **≤2 rows** on mobile (bottom sheet replaces desktop toolbar)
- Action over decoration (dictate orb, home atmosphere, profile overlay)
- ORB glass/light aesthetic and visual identity preserved

---

## Success criteria

ORB on phone should feel like a **mobile-first residential intelligence companion**: ask, record, write and review without fighting desktop chrome. All intelligence, routes, billing, auth and standalone boundaries remain unchanged.
