"""ORB Dictate access — premium, safety and authentication gate."""

from __future__ import annotations

from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access

require_orb_dictate_access = require_rich_orb_premium_access
