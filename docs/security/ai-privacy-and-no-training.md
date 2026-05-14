# AI privacy and no-training position

## No-training policy

- Child, staff, provider and document data must not be used to train external AI models.
- External AI providers are disabled by default unless the provider configures and approves them.
- Demo conversations use synthetic data only.

## Assistant and Orb behaviour

- Assistant and Orb outputs are draft operational support and require adult/manager review.
- Orb and assistant retrieval must stay inside provider/home/role scope.
- Orb must not silently create or update records; writeback requires explicit confirmation in the relevant workflow.
- Realtime voice unavailable states should be shown clearly and should not reconnect-loop or spam errors.

## Redaction and minimisation

- Prompt context should include the minimum record excerpts needed to answer the question.
- Sensitive identifiers should be redacted where they are not necessary for the task.
- Logs should avoid raw child narrative, secrets, tokens and provider credentials.

## Provider configuration

- Providers should confirm whether external AI is enabled, which provider is used, what data categories may be sent and how retention is handled.
- If no provider is configured, the UI should show a graceful unavailable/fallback message.
- The demo seed includes only synthetic sample questions and cited answers.
