# ORB Residential production readiness checklist

- [ ] Apply `sql/207_orb_saved_outputs_canonical.sql`
- [ ] Apply `sql/208_orb_knowledge_source_scope.sql`
- [ ] Confirm `/orb/system/health` status `ok` or documented `degraded`
- [ ] Stripe live keys and webhook secret configured
- [ ] Critical ORB routers load (see `core/router_loader.py` required list)
- [ ] Saved outputs isolation tests pass
- [ ] Dictate premium/safety gating tests pass
- [ ] Knowledge RBAC tests pass
- [ ] Frontend uses `/orb/standalone/conversation` not `/orb/residential/conversation`
