from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["LifeEcho Page"])


@router.get("/life_echo", response_class=HTMLResponse)
def life_echo_page() -> str:
    return """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LifeEcho | IndiCare</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #080b14;
      --panel: rgba(255,255,255,0.08);
      --line: rgba(255,255,255,0.14);
      --text: #f5f7fb;
      --muted: rgba(245,247,251,0.72);
      --glow: rgba(123, 199, 255, 0.38);
      --gold: #f8d77a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 20% 10%, rgba(123,199,255,0.22), transparent 30%),
        radial-gradient(circle at 80% 20%, rgba(248,215,122,0.18), transparent 32%),
        radial-gradient(circle at 50% 90%, rgba(155,126,255,0.20), transparent 35%),
        var(--bg);
      color: var(--text);
      overflow-x: hidden;
    }
    .shell {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 42px 0 64px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 28px;
      align-items: center;
      min-height: 72vh;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.06);
      padding: 9px 13px;
      border-radius: 999px;
      color: var(--muted);
      font-size: 14px;
    }
    .pulse {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: var(--gold);
      box-shadow: 0 0 22px var(--gold);
    }
    h1 {
      font-size: clamp(54px, 8vw, 112px);
      line-height: 0.88;
      letter-spacing: -0.08em;
      margin: 28px 0 22px;
    }
    .lead {
      font-size: clamp(18px, 2vw, 24px);
      line-height: 1.55;
      color: var(--muted);
      max-width: 720px;
    }
    .actions {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: 32px;
    }
    .button {
      border: 1px solid var(--line);
      color: var(--text);
      text-decoration: none;
      padding: 14px 18px;
      border-radius: 16px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(16px);
      font-weight: 650;
    }
    .button.primary {
      background: linear-gradient(135deg, rgba(123,199,255,0.30), rgba(248,215,122,0.22));
      box-shadow: 0 0 48px var(--glow);
    }
    .orb {
      position: relative;
      aspect-ratio: 1;
      border-radius: 40px;
      border: 1px solid var(--line);
      background: linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03));
      box-shadow: inset 0 0 80px rgba(255,255,255,0.05), 0 40px 120px rgba(0,0,0,0.45);
      overflow: hidden;
    }
    .orb:before {
      content: "";
      position: absolute;
      inset: 14%;
      border-radius: 50%;
      background:
        radial-gradient(circle at 35% 30%, rgba(255,255,255,0.72), transparent 15%),
        radial-gradient(circle at 50% 50%, rgba(123,199,255,0.45), rgba(155,126,255,0.22) 45%, rgba(248,215,122,0.16) 65%, transparent 72%);
      filter: blur(0.5px);
      animation: breathe 5.5s ease-in-out infinite;
    }
    .orb:after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
      background-size: 42px 42px;
      mask-image: radial-gradient(circle, black, transparent 70%);
      opacity: 0.35;
    }
    @keyframes breathe {
      0%, 100% { transform: scale(0.96); opacity: 0.85; }
      50% { transform: scale(1.05); opacity: 1; }
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 34px;
    }
    .card {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 24px;
      padding: 22px;
      backdrop-filter: blur(16px);
    }
    .card h2 {
      margin: 0 0 10px;
      font-size: 20px;
      letter-spacing: -0.02em;
    }
    .card p {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
    }
    @media (max-width: 860px) {
      .hero { grid-template-columns: 1fr; min-height: auto; }
      .orb { min-height: 360px; }
      .cards { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <div class="badge"><span class="pulse"></span> LifeEcho is live inside IndiCare</div>
        <h1>Virtual memory box for care.</h1>
        <p class="lead">
          LifeEcho turns emotional moments, relationships, achievements and child-safe memories into a living journey. It is designed to preserve human continuity, not just records.
        </p>
        <div class="actions">
          <a class="button primary" href="/api/life-echo/manifest">View API manifest</a>
          <a class="button" href="/api/life-echo/experience/demo-child/memory-box">Open demo memory payload</a>
        </div>
      </div>
      <div class="orb" aria-label="LifeEcho emotional memory orb"></div>
    </section>

    <section class="cards">
      <article class="card">
        <h2>Emotional timeline</h2>
        <p>Moments become a living journey, showing growth, safety, regulation and relationships over time.</p>
      </article>
      <article class="card">
        <h2>Child memory mode</h2>
        <p>Positive memories, achievements and child-safe reflections are separated from operational records.</p>
      </article>
      <article class="card">
        <h2>Therapeutic intelligence</h2>
        <p>LifeEcho helps teams reflect on what children may be communicating emotionally.</p>
      </article>
    </section>
  </main>
</body>
</html>
"""
