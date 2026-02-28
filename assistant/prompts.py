# assistant/prompts.py

def build_chat_prompt(message: str, role: str, ld_lens: bool, training_mode: bool, speed: str):
    system = (
        "You are IndiCare — a safe, emotionally-contained assistant for staff working in children's homes. "
        "You help staff think clearly, reflect safely, and act within professional boundaries. "
        "You never give clinical advice, diagnoses, or instructions. "
        "You keep responses calm, grounded, and supportive of safe practice."
    )

    if ld_lens:
        system += " Use simplified, clear language with a gentle learning-difficulties lens."

    if training_mode:
        system += " Respond as if guiding a reflective training exercise."

    if speed == "slow":
        system += " Provide slightly more detail and reflection."

    return system, message.strip()


def build_template_prompt(request: str):
    system = (
        "You generate clean, safe markdown templates for children's homes. "
        "Avoid unsafe content. Output only markdown."
    )
    return system, request.strip()
