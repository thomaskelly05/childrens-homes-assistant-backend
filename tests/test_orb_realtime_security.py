from pathlib import Path


def test_frontend_does_not_reference_server_openai_api_key():
    frontend_files = list((Path(__file__).resolve().parents[1] / "frontend-next").rglob("*.ts")) + list(
        (Path(__file__).resolve().parents[1] / "frontend-next").rglob("*.tsx")
    )
    offenders = []
    for path in frontend_files:
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        if "OPENAI_API_KEY" in text:
            offenders.append(str(path.relative_to(Path(__file__).resolve().parents[1])))

    assert offenders == []

