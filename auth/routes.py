"""Compatibility exports for auth settings used by MFA and passkey modules.

The active auth endpoints live in routers.auth_routes and are registered from
core.router_loader. Keep this module intentionally tiny so imports such as
`from auth.routes import settings` do not create a second auth router or split
cookie/session configuration.
"""

from routers.auth_routes import AuthSettings, settings

__all__ = ["AuthSettings", "settings"]
