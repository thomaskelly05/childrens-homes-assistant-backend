from collections import Counter

KEYWORDS = {
    "aggression": ["hit", "punch", "kick", "aggressive"],
    "absconding": ["ran away", "missing", "abscond"],
    "self_harm": ["cut", "self harm", "hurt themselves"],
    "sleep": ["awake all night", "no sleep"],
    "burnout": ["exhausted", "overwhelmed", "burnout"],
}


def detect_patterns(reflections):

    text = " ".join(reflections).lower()

    results = []

    for theme, words in KEYWORDS.items():

        count = 0

        for word in words:
            count += text.count(word)

        if count > 0:
            results.append({
                "theme": theme,
                "count": count
            })

    return results
