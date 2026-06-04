# IndiCare AI Human Review and Accountability

## Draft-only principle

IndiCare AI outputs are **suggestions**, not records. Staff and managers remain accountable for what is saved in the care record.

## When human review is required

| Output type | Review expectation |
|-------------|-------------------|
| Daily notes, incidents, chronology | Author + line manager as per home policy |
| Safeguarding concerns | Registered manager / DSL before sharing externally |
| Reg 44 / Reg 45 / inspection narratives | RI or delegated reviewer sign-off |
| Risk assessments and plans | Named reviewer before activation |
| LADO / police / medical / legal decisions | **Never AI-automated** — human-only |

## Restricted features

The following cannot be sent to external AI:

- `safeguarding_decision*`
- `lado_decision*`
- `police_decision*`
- `medical_diagnosis*`
- `legal_decision*`

Attempts are blocked fail-closed with an auditable reason.

## Staff responsibilities

1. Read AI drafts critically — check names, dates, and facts against source records
2. Do not paste identifiable child data into external tools outside IndiCare
3. Report suspected AI errors or safeguarding misses to the manager immediately
4. Use ORB citations to verify regulatory statements against trusted sources

## Manager responsibilities

1. Configure whether external AI is enabled for the provider
2. Ensure redaction mode matches data sensitivity
3. Review audit dashboards for unusual feature usage or blocks
4. Approve local policy and LSCP sources before ORB cites them in practice guidance

## Accountability chain

```
Staff author → Manager review → Record sign-off → Provider oversight → Regulatory inspection
```

AI assists between author and review; it does not replace review.

## Transparency to children and families

Where required by home policy, explain that drafts may be AI-assisted but all final records are human-approved. IndiCare does not present AI as making decisions about a child's safety.

## Audit evidence

`ai_usage_audit` and privacy decision logs support investigations:

- Who triggered AI (user/home/provider context when available)
- Which feature and model
- Whether redaction was applied
- Whether prompts/transcripts were stored (default: no)

This supports ICO-style accountability without retaining full conversation content by default.
