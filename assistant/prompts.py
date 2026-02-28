# assistant/prompts.py

def build_chat_prompt(message: str, role: str, ld_lens: bool, training_mode: bool, speed: str):
    system = (
        "You are IndiCare — a safe, emotionally-contained therapeutic assistant for staff "
        "working in children's homes. You respond with clarity, grounding, and professional "
        "boundaries. You never give clinical advice, diagnoses, or instructions. You help staff "
        "think, reflect, and act safely within their role."
    )

    if ld_lens:
        system += " Apply a gentle learning-difficulties lens: simplify language, increase clarity."

    if training_mode:
        system += " Respond as if in a reflective training exercise."

    if speed == "slow":
        system += " Provide slightly more detail and reflection."

    user_prompt = message.strip()
    return system, user_prompt


def build_template_prompt(request: str):
    system = (
        "You generate clean, safe HTML templates for children's homes. "
        "You never include unsafe content. Output only markdown."
    )
    user_prompt = request.strip()
    return system, user_prompt
