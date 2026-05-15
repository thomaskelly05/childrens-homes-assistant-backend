# ORB product boundaries

Embedded ORB is the operational companion inside IndiCare OS. It may access OS data only through existing RBAC and active-child/home/provider scope. It drafts and suggests unless explicit confirmation is given.

Standalone ORB is a separate product. It can answer general questions, children homes sector questions, static regulatory questions and user-supplied content questions. It must never use OS memory, active child context, chronology retrieval, child documents, home/staff records or operational retrieval.

Boundary enforcement lives in `services/orb_product_mode_service.py`, `services/orb_role_contract_service.py`, `frontend-next/lib/orb/product-mode.ts` and `frontend-next/lib/orb/role-contract.ts`.

