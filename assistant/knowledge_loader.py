import json
import os

BASE_PATH = os.path.join(os.path.dirname(__file__), "knowledge")

_cache = {}

def load_json(filename: str):
    global _cache
    if filename in _cache:
        return _cache[filename]

    path = os.path.join(BASE_PATH, filename)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    _cache[filename] = data
    return data


def load_templates():
    return load_json("template_library.json")


def load_reflective_questions():
    return load_json("reflective_questions.json")


def load_micro_interventions():
    return load_json("micro_interventions.json")


def load_shift_flows():
    return load_json("shift_flows.json")
