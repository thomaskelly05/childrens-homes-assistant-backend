# ORB Residential — Provider Security FAQ

Plain-language answers for providers evaluating ORB. **Not legal advice.**

### Do users need to log in?

Yes. Product routes and premium APIs require authentication.

### Can inactive subscribers use AI features?

No. Subscription and safety acceptance checks return payment required or blocked responses.

### Is conversation content used to train AI models?

The product is designed to call external providers under your AI governance settings. Confirm training/opt-out terms in your OpenAI (or other) enterprise agreement. IndiCare does not intentionally use ORB content for model training by default.

### Are prompts stored?

**Not by default.** Administrators must explicitly enable prompt or transcript storage with acknowledgements.

### Can staff change AI security settings?

No. Only **admin** role can PATCH provider AI trust settings. Managers can view settings and usage audit.

### What happens on sign out?

Session cookies are cleared and sensitive browser storage utilities run. Users should still close shared browsers.

### Is ORB a safeguarding system?

**No.** ORB assists professional work; it does not replace statutory safeguarding procedures, supervision, or record-keeping obligations.

### How are uploads protected?

File type allowlists, size limits, and rejection of executable extensions. Rate limits reduce abuse.

### What if we hit AI usage limits?

Users see a clear limit message. Daily and plan-based guards are designed to protect cost and fair use.

### Do you have SOC 2?

**Not claimed in this documentation.** Confirm any certification status directly with IndiCare commercially.

### Who do we contact about security?

Use your deployment's configured security/support contact before launch.
