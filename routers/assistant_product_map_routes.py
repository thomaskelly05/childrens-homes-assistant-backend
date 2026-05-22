from __future__ import annotations

from fastapi import APIRouter, Depends

from auth.permissions import require_assistant_access

router = APIRouter(prefix="/assistants", tags=["Assistant Product Map"])


@router.get("/map")
async def assistant_product_map(current_user=Depends(require_assistant_access)):
    return {
        "success": True,
        "data": {
            "products": {
                "indicare_os_assistant": {
                    "name": "IndiCare OS Assistant",
                    "route": "/assistant",
                    "purpose": "Operational assistant inside IndiCare OS.",
                    "os_linked": True,
                    "care_record_access": "permissioned",
                    "allowed_context": [
                        "OS workflows",
                        "care records where authorised",
                        "chronology",
                        "dashboards",
                        "governance",
                        "compliance tooling",
                    ],
                    "must_not_be_used_as": "Standalone public ORB Care Companion",
                },
                "orb_care_companion": {
                    "name": "ORB Care Companion",
                    "route": "/orb",
                    "purpose": "Standalone ChatGPT-style assistant for residential care guidance, reflection and voice.",
                    "api": {
                        "config": "/orb/standalone/config",
                        "conversation": "/orb/standalone/conversation",
                        "health": "/orb/standalone/health",
                    },
                    "os_linked": False,
                    "care_record_access": False,
                    "allowed_context": [
                        "general residential care guidance",
                        "safeguarding principles",
                        "Ofsted and SCCIF style reflection",
                        "therapeutic practice ideas",
                        "recording quality prompts",
                    ],
                    "disallowed_context": [
                        "IndiCare OS records",
                        "young person records",
                        "staff records",
                        "chronology",
                        "operational dashboards",
                        "direct writes into the OS",
                    ],
                },
            },
            "routing_rule": "/assistant is OS-only. /orb is standalone and must call /orb/standalone/* only.",
        },
    }
