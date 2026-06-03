# IndiCare Intelligence — Source Convergence

**Service:** `services/indicare_source_convergence_service.py`

## Purpose

Maps ORB knowledge source packs (`orb_knowledge_source_pack_service`) to trusted source IDs (`assistant/knowledge/trusted_sources_registry.json`).

## Basis tiers

| Tier | Meaning |
|------|---------|
| `built_in_practice` | Built-in practice knowledge |
| `gold_statutory` | Gold statutory source (human review for updates) |
| `silver_clinical` | Silver clinical source |
| `bronze_sector` | Bronze sector learning |
| `local_policy` | Local/provider policy |
| `user_context` | User-provided context |
| `general_model` | General model knowledge |

## Governance

- `no_random_scraping: true`
- `auto_apply_gold_silver: false`
- `human_review_required_for_statutory: true`

## Example pack mapping

| Pack key | Trusted source IDs |
|----------|-------------------|
| `ofsted_sccif` | `ofsted_sccif_childrens_homes` |
| `safeguarding_principles` | `working_together_safeguarding`, `keeping_children_safe_in_education` |
| `childrens_homes_regulations` | `childrens_homes_regulations_2015`, `dfe_childrens_homes_regulations_guide` |

Every Intelligence Core packet includes `source_basis` with layered pack → tier → trusted ID mapping.
