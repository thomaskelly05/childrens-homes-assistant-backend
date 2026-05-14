from __future__ import annotations

import ast
import operator
import os
from typing import Any

from assistant.llm_provider import ChatStreamRequest, get_llm_provider


def _text(value: Any) -> str:
    return str(value or "").strip()


ALLOWED_CALC_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
}


def _safe_eval(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _safe_eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.BinOp) and type(node.op) in ALLOWED_CALC_OPS:
        return float(ALLOWED_CALC_OPS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right)))
    if isinstance(node, ast.UnaryOp) and type(node.op) in ALLOWED_CALC_OPS:
        return float(ALLOWED_CALC_OPS[type(node.op)](_safe_eval(node.operand)))
    raise ValueError("Unsupported calculation")


def _try_calculation(message: str) -> str | None:
    expression = message.lower().replace("calculate", "").replace("what is", "").replace("what's", "")
    allowed = "".join(ch for ch in expression if ch in "0123456789.+-*/()% ")
    if not allowed.strip() or not any(op in allowed for op in "+-*/%"):
        return None
    try:
        parsed = ast.parse(allowed, mode="eval")
        result = _safe_eval(parsed)
    except Exception:
        return None
    formatted = int(result) if result.is_integer() else round(result, 4)
    return f"The answer is {formatted}."


class OrbProductivityService:
    async def answer(self, message: str, *, history: list[dict[str, Any]] | None = None, detail: str = "concise") -> dict[str, Any]:
        calculation = _try_calculation(message)
        if calculation:
            return {"answer": calculation, "tools_used": ["calculations"], "sources": []}

        if os.getenv("OPENAI_API_KEY"):
            try:
                return await self._llm_answer(message, history=history or [], detail=detail)
            except Exception:
                pass

        return {"answer": self._fallback_answer(message), "tools_used": self._tools_for(message), "sources": []}

    async def _llm_answer(self, message: str, *, history: list[dict[str, Any]], detail: str) -> dict[str, Any]:
        provider = get_llm_provider()
        system = (
            "You are Orb's Productivity Brain. Help with writing, planning, summarising and calculations. "
            "Be concise by default, use British English, and do not claim access to IndiCare records."
        )
        if detail == "detailed":
            system += " The user asked for detailed mode, so provide fuller structure."
        messages = [{"role": "system", "content": system}, *history[-8:], {"role": "user", "content": message}]
        parts: list[str] = []
        async for item in provider.stream_chat(
            ChatStreamRequest(messages=messages, model="gpt-4o-mini", temperature=0.2, max_tokens=900, metadata={"structured_output": False})
        ):
            if isinstance(item, str):
                parts.append(item)
        return {"answer": "".join(parts).strip() or self._fallback_answer(message), "tools_used": self._tools_for(message), "sources": []}

    def _tools_for(self, message: str) -> list[str]:
        lower = message.lower()
        if "email" in lower:
            return ["writing", "email_future_foundation"]
        if "plan" in lower or "day" in lower or "agenda" in lower:
            return ["planning", "calendar_future_foundation", "reminders_future_foundation"]
        if "summar" in lower:
            return ["summarising"]
        return ["writing"]

    def _fallback_answer(self, message: str) -> str:
        lower = message.lower()
        if "email" in lower:
            return (
                "Here is a concise professional email draft:\n\n"
                "Subject: Follow-up\n\n"
                "Dear [Name],\n\n"
                "I hope you are well. I wanted to follow up regarding [brief topic]. "
                "Please let me know a convenient time to discuss this or any next steps you would like me to take.\n\n"
                "Kind regards,\n[Your name]"
            )
        if "plan my day" in lower or "agenda" in lower:
            return (
                "A practical day plan:\n"
                "1. Check urgent messages and safeguarding/shift priorities.\n"
                "2. Block focused time for the most important task.\n"
                "3. Group admin and email into one slot.\n"
                "4. Leave a buffer for interruptions.\n"
                "5. End with a short review and tomorrow's first action."
            )
        return "I can help with that. Share the text, goal or audience, and I will produce a concise draft."


orb_productivity_service = OrbProductivityService()

