from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = REPO_ROOT / "frontend-next" / "app"

DYNAMIC_DIR_RE = re.compile(r"^\[.+\]$")


def _dynamic_segment_name(dirname: str) -> str:
    """Return the param name inside a dynamic route folder, e.g. [id] -> id."""
    inner = dirname[1:-1]
    if inner.startswith("..."):
        return inner[3:]
    return inner


def _collect_sibling_dynamic_conflicts(app_root: Path) -> list[tuple[str, list[str]]]:
    conflicts: list[tuple[str, list[str]]] = []
    for parent in sorted(app_root.rglob("*")):
        if not parent.is_dir():
            continue
        dynamic_children = [
            child.name
            for child in parent.iterdir()
            if child.is_dir() and DYNAMIC_DIR_RE.match(child.name)
        ]
        if len(dynamic_children) <= 1:
            continue
        names = sorted({_dynamic_segment_name(name) for name in dynamic_children})
        if len(names) > 1:
            rel = parent.relative_to(app_root).as_posix() or "."
            conflicts.append((rel, dynamic_children))
    return conflicts


def test_no_sibling_dynamic_route_segment_conflicts():
    conflicts = _collect_sibling_dynamic_conflicts(APP_ROOT)
    assert not conflicts, (
        "Conflicting dynamic route folders under the same parent: "
        + "; ".join(f"{parent} -> {dirs}" for parent, dirs in conflicts)
    )


def test_child_workspace_route_uses_standard_id_segment():
    workspace_page = APP_ROOT / "os" / "young-people" / "[id]" / "workspace" / "page.tsx"
    assert workspace_page.is_file(), "Child workspace must live under os/young-people/[id]/workspace"

    yp_dir = APP_ROOT / "os" / "young-people"
    dynamic_children = [
        child.name
        for child in yp_dir.iterdir()
        if child.is_dir() and DYNAMIC_DIR_RE.match(child.name)
    ]
    assert dynamic_children == ["[id]"], f"os/young-people/ must have only [id] dynamic segment, found: {dynamic_children}"


def test_home_workspace_route_uses_standard_id_segment():
    workspace_page = APP_ROOT / "homes" / "[id]" / "workspace" / "page.tsx"
    assert workspace_page.is_file(), "Home workspace must live under homes/[id]/workspace"

    homes_dir = APP_ROOT / "homes"
    dynamic_homes_children = [
        child.name
        for child in homes_dir.iterdir()
        if child.is_dir() and DYNAMIC_DIR_RE.match(child.name)
    ]
    assert dynamic_homes_children == ["[id]"], (
        f"homes/ must have only [id] dynamic segment, found: {dynamic_homes_children}"
    )

    assert not (homes_dir / "[home_id]").exists(), "homes/[home_id] must not exist alongside homes/[id]"
