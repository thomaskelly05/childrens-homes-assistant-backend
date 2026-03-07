# assistant/mode_detector.py

def detect_mode(message: str) -> str:
    """
    Determines which response mode IndiCare should use.
    Modes:
    - factual
    - practical
    - reflective
    """

    text = message.lower()

    factual_keywords = [
        "how often",
        "timescale",
        "statutory",
        "regulation",
        "requirement",
        "legal",
        "policy",
        "guidance",
        "ofsted",
        "review frequency",
        "lac review",
        "pep",
        "supervision frequency"
    ]

    reflective_keywords = [
        "i felt",
        "i feel",
        "i'm unsure",
        "i am unsure",
        "not sure",
        "difficult",
        "challenging",
        "incident",
        "young person",
        "child",
        "situation",
        "what should i think",
        "how should i think"
    ]

    for word in factual_keywords:
        if word in text:
            return "factual"

    for word in reflective_keywords:
        if word in text:
            return "reflective"

    return "practical"
