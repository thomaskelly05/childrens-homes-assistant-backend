import random


REFLECTIVE_QUESTIONS = [

    "What part of the situation stands out most when you think back on it?",

    "What do you notice about how you felt in that moment?",

    "What do you think felt most uncertain or difficult in the situation?",

    "When you reflect on the interaction now, what seems most important?",

    "What do you think you were noticing about the young person's behaviour at the time?",

    "What part of the experience stayed with you afterwards?",

    "What do you feel you might want to understand better about what happened?",

    "Sometimes it helps to slow the moment down — what do you remember noticing first?",

    "If you were exploring this in supervision, what part of the situation might you want to talk through?",

    "What do you think you might want to reflect on further?"
]


def choose_reflective_question():

    return random.choice(REFLECTIVE_QUESTIONS)
