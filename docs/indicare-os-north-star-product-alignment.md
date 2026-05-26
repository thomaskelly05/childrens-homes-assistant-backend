# IndiCare OS — North star product alignment

Plain-language reference for product, design and development.

## 1. What IndiCare OS is

IndiCare OS is a **child-centred operating system** for residential children’s homes. Every record, report, plan, risk assessment, signature, pattern, trend and decision is meant to connect into **one safer journey** for each child.

Staff should feel that IndiCare **helps adults see the child clearly**, record safely, act sooner, evidence better, and create a calmer, safer home — not that they are feeding a database.

## 2. What IndiCare OS is not

- Not a pile of disconnected modules competing for attention  
- Not a compliance box-ticking exercise that claims guaranteed grades  
- Not multiple ORBs on one screen  
- Not eighty forms shown as boxes on first load  
- Not a panic folder of alerts with no journey  

## 3. Child-centred operating model

**One home, one child, one journey.** The child’s story sits at the centre. Adults **record once**; IndiCare connects chronology, plans, reviews, safeguarding, inspection evidence and manager oversight.

## 4. One record, many uses

A single well-made record can flow into:

- Manager review and sign-off  
- Archive and chronology  
- Plan impact suggestions  
- LifeEcho and child voice  
- Inspection evidence (where appropriate)  
- Patterns and trends (where data exists)  

Duplication is reduced when the lifecycle is respected.

## 5. ORB as quiet copilot

> **The quiet copilot for children’s homes — present when needed, invisible when not.**

ORB can guide recording, check quality, reduce duplication, prepare evidence, support staff confidence, protect managers from missed oversight, and speak in children’s homes language (including Ofsted, SCCIF and Quality Standards context).

**Product split (must stay):**

| Surface | Route | Role |
|--------|-------|------|
| Standalone companion | `/orb` | ChatGPT-style; no OS record access by default |
| Operational OS assistant | `/assistant/orb` | Scoped, permissioned workspace intelligence |
| Recording editor | ORB live coach only | One ORB surface while writing |

**One ORB presence per page** — no duplicate sidebar + rail + floating button + page card.

## 6. Form lifecycle

Every important record follows:

**Draft → ORB check → Submit → Manager review → Sign off → Archive → Chronology → Plans / reports / trends**

UI should show **where** a record is in that journey, not hide it behind technical labels.

## 7. Approval queue model

Managers need **one clear queue** for records awaiting attention:

- Awaiting manager review  
- Returned for amendment  
- Signed off  
- Escalated (safeguarding / urgent)  
- Overdue / urgent priority  

Judgement always stays with humans; the queue organises work.

## 8. Reg 44 / Ofsted readiness model

Presentation uses calm language:

- **Inspection readiness**  
- **Evidence snapshot**  
- **Quality Standards alignment**  
- **Gaps to review**  

We do **not** claim guaranteed compliance or predict grades. Evidence areas include Reg 44, safer recruitment, supervisions, incidents, safeguarding, complaints, medication, restraints, missing episodes, risk assessments, child voice and management oversight — as data allows.

## 9. Patterns and trends model

Where analytics exist, show:

- Child-level trends  
- Staff recording trends  
- Home safeguarding trends  
- Time / location / behaviour / trigger / response patterns  
- Status: **improving**, **repeating**, **action needed**  

Do not invent analytics; use route hints when a surface is partial.

## 10. Menu philosophy

Menus should **mean something** — Home, Children, Records, Safeguarding, Plans, Governance, Regulation, ORB, Settings — not expose every technical module at once.

**Scope-first:** when a home or child is selected, sidebar prioritises that journey (overview, record, chronology, plans, reviews, alerts, more).

**More** holds secondary and legacy routes; nothing important is deleted, only organised.

## 11. Legacy feature preservation

Built systems (assistant UI, reports, runtime, command centre, governance, document features) remain reachable via **More**, route hints or search. Refine and connect — do not remove.

## 12. UI principles

1. Calm, purposeful, child-centred  
2. Accordions and compact sections over wall of boxes  
3. Real links (`<a href="…">`), not dead div-buttons  
4. No `href="#"` or empty hrefs  
5. Scope-first: do not load heavy global dashboards on workspace first paint  
6. Inspection readiness builds quietly in the background  
7. Nothing should feel like feeding a system  

## 13. Remaining limitations

- Some routes are **route hints** until full workspace wiring is complete  
- Patterns/trends depend on existing intelligence services per home/child  
- Legacy and modern UIs coexist during convergence  
- Database and permission errors may show degraded workspace panels  
- ORB cannot replace statutory safeguarding or manager decisions  

---

*Last updated: product alignment pass — north star, navigation, calm UI, ORB tidy.*
