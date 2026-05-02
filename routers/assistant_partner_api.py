from fastapi import APIRouter, Header, HTTPException
from schemas.assistant_partner_api import PartnerAssistantRequest, PartnerAssistantResponse
from services.assistant_partner_service import generate_partner_response

router = APIRouter(prefix="/v1/assistant", tags=["Partner Assistant"])

API_KEY = "indicare_demo_key"

@router.post("/respond", response_model=PartnerAssistantResponse)
async def respond(payload: PartnerAssistantRequest, x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    answer = await generate_partner_response(payload.message)

    return PartnerAssistantResponse(answer=answer)
