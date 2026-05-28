# ORB Premium AI Workspace Design Specification

## Product

# ORB Residential

Powered by IndiCare Intelligence.

Public route:

`/orb`

The product should feel closer to:

- ChatGPT
- Microsoft Copilot
- Grok
- Claude

but with a residential children's homes intelligence layer.

---

# Design principle

ORB is not a dashboard.

ORB is a calm premium AI workspace for adults working in residential care.

The experience should feel:

- intelligent
- focused
- premium
- emotionally safe
- fast
- mobile-first
- professional
- supportive during shift pressure

It should not feel:

- like an internal admin tool
- like a form system
- like a cluttered care dashboard
- like a compliance robot
- like an OS-lite product

---

# Canonical app structure

## Public app path

`app.indicare.co.uk/orb`

Everything user-facing should feel like it lives here.

Internal API routes may remain under:

- `/orb/standalone/*`
- `/orb/residential/*`

but users should only experience:

- `/orb`

---

# Core AI product features to converge

## 1. Chat workspace

Like ChatGPT/Grok/Copilot:

- central conversation canvas
- assistant and user message bubbles
- streaming/thinking state
- edit last message
- regenerate response
- copy response
- save response
- export response
- source/citation display where available
- response action bar

---

## 2. Composer

The composer is the most important UI element.

It should include:

- large calm input
- mode selector
- upload button
- voice button
- tools button
- send button
- clear disabled state
- shortcut chips
- attachment preview
- document context indicator
- dictation state

Composer should not look like a standard form field.

It should feel like the centre of the product.

---

## 3. Modes

Modes should feel like AI capabilities, not menu pages.

Primary modes:

- Ask ORB
- Record This Properly
- Shift Builder
- Safeguarding Thinking
- Therapeutic Reframe
- Ofsted Lens
- Manager Copilot
- Staff Coach
- Reg 44 / Reg 45 Prep
- Deep Research

Modes should be accessible from:

- composer dropdown
- starter prompts
- command palette later

---

## 4. Sidebar

Sidebar should be grouped and collapsible.

Recommended groups:

### Core

- New chat
- Search
- Conversations

### Intelligence

- Agents
- Deep research
- Knowledge library
- Tools

### Workspace

- Projects
- Saved outputs
- Documents

### Personalisation

- Profile
- Memory
- Accessibility
- Settings

The sidebar should not expose every feature as a flat list.

---

## 5. Projects

Projects should work like ChatGPT Projects, but for residential practice.

Use cases:

- supervision preparation
- policy review
- Ofsted preparation
- reflective practice
- recording quality improvement
- training plans
- manager oversight thinking

Projects must remain standalone and must not write into OS records.

---

## 6. Memory and profile

ORB should have user-owned memory/profile.

Examples:

- role
- home type
- preferred response style
- accessibility needs
- writing style
- supervision focus
- common workflows

Important boundary:

This is ORB memory only.
It is not IndiCare OS records.

---

## 7. Voice

Voice should support:

- push-to-talk
- dictation into composer
- voice answer style
- reflective spoken summaries
- shift note capture later

No passive listening.

---

## 8. Uploads and documents

ORB should support:

- upload document
- summarise
- ask questions
- safeguarding lens
- Ofsted lens
- recording quality lens
- manager briefing
- action plan

Documents remain standalone unless explicitly exported by the user.

---

## 9. Deep research

Deep research should support:

- policy exploration
- regulatory comparison
- practice guidance review
- Ofsted/SCCIF preparation
- thematic evidence mapping

It should clearly show:

- sources
- confidence
- limitations
- whether live web was used

---

## 10. Connected apps later

After ORB design is right, login and connected apps should support:

- Google login
- Microsoft login
- Apple login
- email magic link
- Stripe checkout with Apple Pay / Google Pay / Link

Future connected app possibilities:

- Google Drive document import
- Microsoft OneDrive/SharePoint document import
- Outlook/Google Calendar for supervision planning
- email drafting/export

Important:

Connected apps must not blur the ORB/OS boundary.

---

# Premium visual direction

ORB should feel:

- spacious
- cinematic
- calm
- glassy but readable
- soft shadows
- high-quality microinteractions
- strong ORB identity
- better than an admin system

Recommended visual patterns:

- grouped glass sidebar
- central conversation canvas
- strong but not oversized ORB mark
- premium composer
- subtle blue/cyan/indigo glow
- dark mode later
- smooth hover states
- command style actions

---

# Immediate UI priorities

## Priority 1 — Composer redesign

The composer must become premium.

Work needed:

- cleaner input structure
- softer action row
- grouped tool buttons
- better mode dropdown
- better send button
- better focus state
- attachment/voice affordances

## Priority 2 — Sidebar grouping

Done structurally, but needs further polish.

Work needed:

- cleaner labels
- better collapsed states
- less visual noise
- premium section styling
- compact profile/settings bottom area

## Priority 3 — Home/empty state

Needs stronger product identity.

Work needed:

- reduce repeated ORB logo issue
- clearer starter prompts
- mode cards inside the chat, not dashboard cards
- stronger emotional positioning

## Priority 4 — Response actions

Every ORB answer should support:

- copy
- save
- export
- regenerate
- improve wording
- use in Shift Builder

---

# Non-negotiable product boundary

ORB Residential must never imply it can access:

- live child records
- chronology
- provider dashboards
- governance systems
- operational state

The UI should say:

`No OS records accessed`

but this should be subtle, not visually dominant.

---

# Success criteria

The user should open `/orb` and feel:

> This is a serious AI product built for my world.

Not:

> This is another care system menu.
