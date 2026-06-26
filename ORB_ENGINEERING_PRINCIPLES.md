# ORB Engineering Principles

Ethical intelligence for children’s homes must be built with more discipline than ordinary software. ORB Residential supports adults who care for children, helps improve recording quality, and strengthens reflection. It does not replace professional judgement, safeguarding processes, managers, social workers, or Ofsted-regulated decision making.

Every change must protect the child, the adult’s workflow, safeguarding accuracy, existing working routes, cost, speed, and trust.

## 1. The child comes first

Every feature should improve outcomes for children by helping adults care, reflect, record, evidence, or understand more effectively.

Before building or changing anything, ask:

> Does this help adults care better, record safer, and evidence the child’s experience more clearly?

If the answer is unclear, pause before building.

## 2. Records are part of a child’s story

Records are not just admin. For children in care, records may become part of their lifelong story.

Build with the assumption that every generated prompt, rewritten sentence, summary, report, or suggested reflection may one day be read by the young person it describes.

ORB must support records that are factual, warm, balanced, person-centred, dignified, specific, and free from blaming or punitive language.

## 3. Support professional judgement

ORB strengthens adult thinking. It does not make decisions for adults.

The product should consistently reinforce:

- the adult remains responsible for reviewing, editing, and approving records;
- local safeguarding procedures must be followed;
- managers and professionals remain accountable for decisions;
- uncertainty must be surfaced rather than hidden.

## 4. Safety before cleverness

Do not introduce AI behaviour that looks impressive but reduces reliability, clarity, or safety.

For ORB, the order is:

1. factual before fluent;
2. transparent before magical;
3. explainable before automated;
4. safe before fast;
5. useful before impressive.

## 5. Be honest with uncertainty

ORB must not invent missing information, fabricate evidence, create unsupported conclusions, or present interpretation as fact.

Where information is incomplete, the system should say so and prompt the adult to add what is missing.

The system should distinguish between:

- observation;
- interpretation;
- professional reflection;
- the child’s voice;
- AI-generated suggestion.

## 6. Change carefully

Make the smallest safe change that solves the real problem.

Before changing code:

- read the files that already exist;
- understand the current route, state, data, and UI flow;
- identify what already works;
- name the assumption being made;
- avoid rewriting working areas unnecessarily.

Do not break working routes while improving broken ones.

## 7. Test what matters

Testing is not optional. Verification is proof that the change works and has not damaged existing behaviour.

For ORB, check:

- routes still load;
- chat remains the front door;
- records can still be created, reviewed, copied, exported, or saved as intended;
- mobile and desktop layouts still work;
- safeguarding and escalation wording remains safe;
- errors are clear and do not expose sensitive information;
- cost-heavy AI calls are not introduced unnecessarily.

If a change cannot be tested properly, say so clearly.

## 8. Design for real children’s homes

ORB must work in real residential childcare conditions, not just in a demo.

Build for:

- busy shifts;
- tired adults;
- interruptions;
- mobile use;
- poor Wi-Fi;
- inspection pressure;
- emotionally charged incidents;
- managers needing oversight quickly;
- adults who need calm, simple workflows.

A feature that only works in perfect conditions is not ready.

## 9. Simplicity is the default

Complexity must earn its place.

Avoid unnecessary tabs, duplicate routes, bloated prompts, clever abstractions, hidden state, or multiple ways of doing the same thing unless there is a clear operational reason.

The adult should feel:

> I know what to do next.

## 10. Cost is a product feature

ORB must be commercially viable and affordable for children’s homes.

Every AI feature should consider:

- token usage;
- latency;
- model choice;
- caching;
- retry behaviour;
- background jobs;
- duplicated calls;
- whether a smaller, cheaper step would achieve the same result.

The best AI workflow is the smallest one that safely produces the right outcome.

## 11. Preserve trust

Trust is harder to rebuild than code.

Do not silently edit user records. Do not hide AI involvement. Do not overclaim confidence. Do not imply compliance is guaranteed. Do not present ORB as a replacement for adults, managers, safeguarding procedures, or professional judgement.

Use language such as:

- supports;
- helps evidence;
- prompts reflection;
- improves consistency;
- supports safer recording;
- helps adults think before they write.

Avoid language such as:

- guarantees compliance;
- automates care;
- replaces managers;
- makes safeguarding decisions.

## 12. Build to last

Every decision should make ORB easier to maintain, safer to extend, and clearer to operate.

Future contributors should be able to understand:

- why the feature exists;
- what it depends on;
- what safety constraints apply;
- how it should be tested;
- where costs may grow;
- what must not be broken.

## Working rule

Build slowly enough that we do not damage trust. Change only what needs changing. Test what matters. The child, the record, and the adult’s judgement come first.
