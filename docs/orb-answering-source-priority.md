# ORB answering source priority

Implemented in `services/orb_knowledge_answer_priority_service.py` and injected into `orb_knowledge_retrieval_service` grounding blocks.

## Order

1. Immediate safeguarding / safety boundaries  
2. Approved provider/home policy  
3. Approved local protocol  
4. Official guidance library (curated metadata + approved uploads)  
5. ORB Recording Framework  
6. General ORB intelligence (IndiCare Intelligence Core)

## Citation guards

- If no approved home policy is available, ORB should include:  
  *“I can give general guidance, but I cannot see an approved home policy for this yet.”*
- Do not say “your policy says” unless an approved document was selected and used.
- Show draft/needs_review status when referencing uploads.

## Not in scope

- Scraping websites for guidance updates  
- Bypassing redaction, audit, or provider AI settings  
- Separate AI brain outside Intelligence Core
