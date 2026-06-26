# CLAUDE.md

These instructions apply to any AI coding agent working on IndiCare Intelligence or ORB Residential.

Read this before writing code. Then read `ORB_ENGINEERING_PRINCIPLES.md`, `SAFETY.md`, `ARCHITECTURE.md`, and `CONTRIBUTING.md` where relevant.

## Product truth

IndiCare Intelligence is ethical intelligence for Ofsted-regulated children’s homes. ORB Residential is the first product.

ORB supports adults to think, write, evidence, reflect, and respond better. It does not replace adults, managers, safeguarding processes, social workers, inspectors, therapeutic formulation, or professional judgement.

The child remains central.

Every task must ask:

> Does this help adults care better, record safer, and evidence the child’s experience more clearly?

## Working standard

Before changing code:

1. Read the existing files involved.
2. Identify the current route, state, component, API, and data flow.
3. State the assumption being made.
4. Make the smallest safe change.
5. Do not rewrite working areas unnecessarily.
6. Do not introduce duplicate routes, duplicate stations, duplicate prompts, or duplicate state systems.
7. Test the thing changed and the nearest working flow.
8. Say clearly what changed, what was not changed, and what still needs verification.

If something is unclear, investigate. Do not guess.

## Non-negotiables

- Do not break working `/orb` routes.
- Chat is the front door unless explicitly changed by the founder.
- ORB stations should route through the same intelligence brain and design language.
- Do not introduce AI features that silently create, edit, save, send, or escalate records without adult review.
- Do not make safeguarding decisions.
- Do not diagnose children or adults.
- Do not invent facts, evidence, citations, case details, compliance status, or inspection readiness.
- Do not overclaim that ORB guarantees compliance.
- Do not use blaming, punitive, shaming, or behaviour-only language in generated records.
- Do not expose identifiable child, staff, provider, or safeguarding information in logs, test data, public output, or screenshots.

## ORB tone and behaviour

ORB should feel calm, safe, specialist, premium, and human-centred.

Generated writing should be:

- factual;
- warm;
- balanced;
- therapeutic;
- person-centred;
- specific;
- evidence-based;
- free from judgemental wording;
- clear about what is observation and what is interpretation.

The system should prompt adults to include:

- what happened;
- what was observed;
- what the child may have been communicating;
- the child’s voice where known;
- what adults did to support;
- what helped;
- what did not help;
- follow-up, oversight, and escalation where needed.

## Engineering rules

### Read before writing

Never start from a blank rewrite unless the task explicitly requires replacement and the risk is understood.

Search for existing patterns first. Follow the current architecture unless there is a clear reason not to.

### Small changes only

Prefer surgical changes. Large refactors need explicit justification and a rollback plan.

### Keep the adult in control

Any AI-generated record, report, reflection, or prompt must be reviewable and editable before use.

### Cost-aware AI

Avoid unnecessary large prompts, repeated calls, hidden retries, expensive default models, or duplicated context payloads. Cost control is part of product safety and commercial viability.

### Mobile and shift reality

Assume users are on shift, interrupted, tired, using mobile, and dealing with emotionally charged situations. Avoid fragile workflows.

### Error handling

Errors should be clear, calm, and safe. They must not expose sensitive data. They should help the adult know what to do next.

## Verification checklist

For any change, check the relevant items:

- route loads;
- auth is not weakened;
- chat remains available;
- mobile layout remains usable;
- existing station navigation still works;
- API contract remains stable;
- generated writing remains safe and child-centred;
- sensitive data is not leaked;
- tests, typecheck, or build have been run where possible;
- any untested area is named honestly.

## Communication back to Tom

Use plain English. Be direct. Do not flatter. Do not hide risk.

Always report:

- what changed;
- why it changed;
- what was tested;
- what was not tested;
- risks or follow-up work;
- whether anything working was touched.

Do not say “complete” unless the change is implemented and verified.

## Guiding rule

Build slowly enough that we do not damage trust. Change only what needs changing. Test what matters. The child, the record, and the adult’s judgement come first.
