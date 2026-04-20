from fastapi import APIRouter

# Router modules are discovered and included from app.py. Keep this package
# init lightweight to avoid importing heavy assistant stacks during unrelated
# module imports (for example, in tests that monkeypatch dependencies first).

api_router = APIRouter()
