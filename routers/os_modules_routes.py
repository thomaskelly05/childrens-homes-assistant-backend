from fastapi import APIRouter

from services.os_modules_service import OSModulesService

router = APIRouter(prefix="/os-modules", tags=["os-modules"])


@router.get("/")
def get_modules():
    return OSModulesService().modules()
