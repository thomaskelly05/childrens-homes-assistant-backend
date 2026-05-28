# ORB Residential — Subscription & Onboarding Architecture

## Objective

Create a premium onboarding and subscription experience for ORB Residential.

The experience should feel:

- calm
- premium
- emotionally intelligent
- supportive
- residential-care aware

NOT:

- corporate
- sales heavy
- generic SaaS

---

# Commercial model

## Product

# ORB Residential

Powered by IndiCare Intelligence.

### Subscription

- £9.99/month per user

### Included

- Full ORB Residential access
- Shift Builder
- Recording intelligence
- Safeguarding thinking
- Therapeutic reframe
- Ofsted lens
- Document support
- Voice workflows
- Saved outputs
- Knowledge guidance
- Reflective workflows

---

# Access states

## Visitor

Not authenticated.

Can:

- view landing pages
- view product information
- access demo screenshots
- access limited preview content

Cannot:

- use ORB runtime
- save outputs
- access intelligence workflows

---

## Trial User

Authenticated.

### Recommended trial

- 7 days
OR
- limited message allowance

### Purpose

Allow users to experience:

- ORB personality
- recording quality
- safeguarding support
- shift support
- therapeutic workflows

---

## Premium User

Authenticated + active subscription.

Full access to:

- ORB Residential
- premium workflows
- saved outputs
- projects
- voice workflows
- future mobile sync

---

# Required database additions

## orb_trials

Suggested fields:

- id
- user_id
- started_at
- expires_at
- converted_at
- status
- source

---

## orb_usage_events

Suggested fields:

- id
- user_id
- mode
- tokens_in
- tokens_out
- model
- estimated_cost
- latency_ms
- created_at

Purpose:

- cost control
- usage analytics
- abuse prevention
- future fair usage limits

---

## orb_saved_projects

Suggested fields:

- id
- user_id
- title
- description
- created_at
- updated_at

---

## orb_saved_outputs

Suggested fields:

- id
- user_id
- workflow
- output_type
- content
- tags
- created_at

---

# Onboarding flow

## Step 1 — Role selection

Ask:

- Residential Support Worker
- Senior
- Deputy Manager
- Registered Manager
- Responsible Individual
- Therapist
- Education staff
- Agency worker
- Other

Purpose:

- personalise ORB tone
- personalise workflows
- personalise examples
- personalise onboarding

---

## Step 2 — Work environment

Ask:

- solo home
- therapeutic home
- EBD
- autism
- complex needs
- supported accommodation
- mixed provision

Purpose:

- shape ORB reasoning
- shape safeguarding framing
- shape examples

---

## Step 3 — Preferred support style

Ask:

- concise
- reflective
- coaching
- structured
- manager-style
- therapeutic-style

Purpose:

- personalise ORB responses
- improve emotional connection

---

## Step 4 — First workflow

Guide user into:

- Shift Builder
OR
- Record This Properly

Goal:

Immediate value within minutes.

---

# Premium UX principles

ORB Residential should feel:

- emotionally safe
- non-judgemental
- supportive
- intelligent
- trustworthy
- calm
- premium

Avoid:

- cluttered enterprise UI
- excessive menus
- loud compliance branding
- robotic assistant language

---

# Strategic goal

The onboarding flow should make users feel:

# “ORB understands my role.”

That emotional connection is critical for retention.
