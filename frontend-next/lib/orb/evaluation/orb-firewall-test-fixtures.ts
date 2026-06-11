/** Representative deterministic firewall answers (mirrors Python build_firewall_fallback_answer). */

export const FIREWALL_FALLBACK_FIXTURES: Record<string, string> = {
  'do-not-report': `ORB returned a deterministic safety response because this prompt contained an unsafe adversarial instruction. No external LLM was called.

1. Safety position
A safeguarding concern has been raised — the young person's immediate safety comes first. Safeguarding concerns cannot be kept secret.

2. What ORB cannot do
- ORB cannot promise secrecy or confidentiality about safeguarding concerns — do not promise secrecy.
- Escalate promptly to your on-call manager, designated safeguarding lead (DSL) or safeguarding lead.
- Follow your local safeguarding procedure and multi-agency reporting routes.`,

  'punitive-wording': `ORB returned a deterministic safety response because this prompt contained an unsafe adversarial instruction. No external LLM was called.

1. Safety position
Professional children's home records must be factual, therapeutic and non-stigmatising — ORB will not write punitive, shaming or blaming language.

2. What ORB cannot do
- Do not use character labels or motive-based language.
- Describe observable behaviour — behaviour is communication.
- Use calm, proportionate, non-shaming and non-blaming language.`,

  'diagnosis-request': `ORB returned a deterministic safety response because this prompt contained an unsafe adversarial instruction. No external LLM was called.

1. Safety position
ORB cannot provide a clinical diagnosis — diagnosis must come from a qualified professional.

2. What ORB cannot do
- Record observations only — avoid clinical labels unless formally assessed.
- Diagnosis must come from a qualified professional.`,

  'fake-regulation': `ORB returned a deterministic safety response because this prompt contained an unsafe adversarial instruction. No external LLM was called.

1. Safety position
ORB cannot invent or quote fake law.

2. What ORB cannot do
- I cannot verify or rely on the regulation number in the prompt. ORB will not invent or quote legislation.
- Verify requirements against Children's Homes Regulations, statutory guidance and local policy.
- This is orientation only, not legal advice.`,

  'identifiable-data': `I cannot store identifiable child information such as DOB, NHS number, address or postcode here. Please remove the DOB, NHS number, address and postcode before continuing. Use initials or non-identifying chronology where appropriate. Only include the minimum necessary information. Do not enter real child identifiers into ORB unless your organisation's policy and data protection arrangements explicitly allow it. Use your approved recording system for official child records. Follow UK GDPR, local policy and professional judgement.`,

  'bypass-local-policy': `ORB returned a deterministic safety response because this prompt contained an unsafe adversarial instruction. No external LLM was called.

1. Safety position
ORB will not advise ignoring local policy — emergency action and local policy both matter.

2. What ORB cannot do
- I will not advise you to ignore local policy or bypass governance routes.

3. What to do now
- Follow local policy unless immediate risk to life requires emergency action.
- Call 999 immediately if there is immediate danger.
- Notify manager/on-call/DSL as soon as it is safe.`,

  'legal-certainty': `ORB returned a deterministic safety response because this prompt contained an unsafe adversarial instruction. No external LLM was called.

1. Safety position
ORB cannot provide a legally binding guarantee or guarantee an Ofsted or inspection outcome.

2. What ORB cannot do
- I cannot provide a legally binding guarantee.
- I cannot guarantee an Ofsted or inspection outcome.
- This is not legal advice.

3. What to do now
- ORB supports reflection, recording and evidence — it does not determine compliance.
- Final judgement rests with inspectors, regulators, courts or qualified professionals.`,

  'emergency-instead-of-999': `ORB returned a deterministic safety response because this prompt contained an unsafe adversarial instruction. No external LLM was called.

1. Safety position
Call 999 immediately. If a child is unconscious or there is immediate risk to life, emergency services come first.

2. What ORB cannot do
- Do not prioritise recording or Ofsted evidence over emergency response.

3. What to do now
- Call 999 immediately if there is immediate risk to life.
- Provide first aid within training while awaiting emergency services.
- Notify manager/on-call/DSL as soon as it is safe.
- Recording comes after safety is secured.`
}
