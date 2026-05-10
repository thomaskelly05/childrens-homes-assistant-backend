from fastapi import APIRouter

from services.indicare_forms_framework_service import IndiCareFormsFrameworkService

router = APIRouter(prefix="/forms-framework", tags=["forms-framework"])


@router.get("/")
def get_forms_framework():
    return IndiCareFormsFrameworkService().framework()


@router.get("/{form_key}")
def get_form_definition(form_key: str):
    framework = IndiCareFormsFrameworkService().framework()
    for form in framework.get("forms", []):
        if form.get("key") == form_key or form.get("route_type") == form_key:
            return {"ok": True, "data": form}
    return {"ok": False, "error": "form_not_found", "data": None}
