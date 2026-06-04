from services.ai_external_call_governance import governed_draft_text


def generate_title(
    message: str,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
) -> str:
    prompt = f"""
    Create a very short conversation title (max 6 words).

    Message:
    {message}
    """
    response = governed_draft_text(
        feature="metadata",
        prompt=prompt,
        model="gpt-4o-mini",
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        metadata={"route": "title_service.generate_title", "draft_only": True},
    )
    return (response.text or "Conversation").strip()
