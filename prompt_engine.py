# prompt_engine.py

from overlays.training_overlay import TRAINING_OVERLAY
from overlays.reflective_brain_prompt import REFLECTIVE_BRAIN_SYSTEM_PROMPT
from overlays.template_engine_prompt import TEMPLATE_ENGINE_SYSTEM_PROMPT

from log_helpers import logger  # if you have a logger module
from openai import OpenAI

client = OpenAI()

# ---------------------------------------------------------
# ROLE NORMALISATION + OVERLAYS
# ---------------------------------------------------------

ROLE_MAP = {
    "rcw": "rcw",
    "care worker": "rcw",
    "residential childcare worker": "rcw",
    "childcare worker": "rcw",
    "support worker": "rcw",
    "team leader": "team_leader",
    "tl": "team_leader",
    "senior": "team_leader",
    "shift leader": "team_leader",
    "registered manager": "registered_manager",
    "rm": "registered_manager",
    "manager": "registered_manager",
    "reg manager": "registered_manager",
    "home manager": "registered_manager",
}

ROLE_OVERLAY = {
    "rcw": "You are supporting a Residential Childcare Worker...",
    "team_leader": "You are supporting a Team Leader...",
    "registered_manager": "You are supporting a Registered Manager...",
}

LD_OVERLAY = (
    "LD LENS: The young person has learning differences. "
    "Adjust language, pacing, and structure accordingly."
)

def normalise_role(role: str | None) -> str | None:
    if not role:
        return None
    role = role.lower().strip()
    return ROLE_MAP.get(role, None)

# ---------------------------------------------------------
# CHAT PROMPT BUILDER
# ---------------------------------------------------------

def build_chat_prompt(
    message: str,
    role: str,
    ld_lens: bool,
    training_mode: bool,
    speed: str,
):
    """
    Returns:
        system_prompt: str
        user_prompt: str
    """

    user_prompt = message

    # Role overlay
    normalised = normalise_role(role)
    if normalised:
        overlay = ROLE_OVERLAY.get(normalised, "")
        if overlay:
            user_prompt = overlay + "\n\n" + user_prompt

    # LD lens
    if ld_lens:
        user_prompt = LD_OVERLAY + "\n\n" + user_prompt

    # Training mode
    if training_mode:
        user_prompt = TRAINING_OVERLAY + "\n\n" + user_prompt

    # Speed
    if speed == "slow":
        user_prompt = (
            "SLOW MODE: Take your time, offer slightly more detail, "
            "but stay clear and grounded.\n\n" + user_prompt
        )

    return REFLECTIVE_BRAIN_SYSTEM_PROMPT, user_prompt

# ---------------------------------------------------------
# CHAT STREAM EXECUTION
# ---------------------------------------------------------

def run_chat_stream(system_prompt: str, user_prompt: str):
    """
    Returns a generator that yields streamed text chunks.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=900,
            stream=True,
        )

        for chunk in response:
            try:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
            except Exception as stream_err:
                logger.error(f"Streaming error: {stream_err}")
                break

    except Exception as e:
        logger.error(f"OpenAI chat stream error: {e}")
        yield "\n[Sorry, something went wrong generating this response.]"

# ---------------------------------------------------------
# TEMPLATE PROMPT BUILDER
# ---------------------------------------------------------

def build_template_prompt(template_request: str):
    return TEMPLATE_ENGINE_SYSTEM_PROMPT, template_request

# ---------------------------------------------------------
# TEMPLATE COMPLETION EXECUTION
# ---------------------------------------------------------

def run_template_completion(system_prompt: str, user_prompt: str):
    try:
        result = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=900,
        )
        return result.choices[0].message.content

    except Exception as e:
        logger.error(f"Template completion error: {e}")
        return None
