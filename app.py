import startup_live_child_scope_patch  # noqa: F401
import startup_live_chronology_fallback_patch  # noqa: F401
from core.app_factory import create_app

app = create_app()
