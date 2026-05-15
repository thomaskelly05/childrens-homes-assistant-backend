from fastapi import APIRouter, Depends

from auth.permissions import require_read_access
from services.child_workspace_context_service import child_workspace_context_service
from services.os_modules_service import OSModulesService
from services.indicare_forms_framework_service import IndiCareFormsFrameworkService
from services.os_intelligence_service import OSIntelligenceService

router = APIRouter(prefix="/os-modules", tags=["os-modules"])


@router.get("/")
def get_modules():
    return OSModulesService().modules()


@router.get("/forms-framework")
def get_forms_framework():
    return IndiCareFormsFrameworkService().framework()


@router.get("/forms-framework/{form_key}")
def get_form_definition(form_key: str):
    framework = IndiCareFormsFrameworkService().framework()
    for form in framework.get("forms", []):
        if form.get("key") == form_key or form.get("route_type") == form_key:
            return {"ok": True, "data": form}
    return {"ok": False, "error": "form_not_found", "data": None}


@router.get("/intelligence/child/{young_person_id}")
def get_child_intelligence(
    young_person_id: int,
    current_user=Depends(require_read_access),
):
    child_workspace_context_service.assert_child_access(
        young_person_id=young_person_id,
        current_user=current_user,
    )
    return OSIntelligenceService().child_intelligence(young_person_id=young_person_id)


@router.get("/intelligence/home/{home_id}")
def get_home_intelligence(
    home_id: int,
    current_user=Depends(require_read_access),
):
    child_workspace_context_service.assert_home_access(
        home_id=home_id,
        current_user=current_user,
    )
    return OSIntelligenceService().home_intelligence(home_id=home_id)
