import Link from 'next/link'

export default function LegacyBuildLivePage() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem', background: 'linear-gradient(180deg,#020617,#0f172a)', color: 'white', fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
      <section style={{ maxWidth: 980, margin: '0 auto', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 32, padding: 'clamp(1.5rem,4vw,3rem)', background: 'rgba(15,23,42,0.78)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
        <p style={{ color: '#93c5fd', fontSize: 12, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase' }}>Legacy frontend still active</p>
        <h1 style={{ margin: '1rem 0 0', fontSize: 'clamp(2.8rem,8vw,6rem)', lineHeight: 0.95, letterSpacing: '-0.08em' }}>
          This is the old front door.
        </h1>
        <p style={{ marginTop: '1.25rem', maxWidth: 780, color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.75 }}>
          If you are seeing this page on app.indicare.co.uk, the custom domain is still serving the legacy `frontend-next` runtime. The new brief-led OS lives in `indicare-frontend-next` and Render needs to finish building from that root before the canonical OS appears here.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <Link href="https://indicare-frontend-next.onrender.com/build-live" style={{ borderRadius: 18, background: '#2563eb', color: 'white', padding: '0.95rem 1.1rem', fontWeight: 900, textDecoration: 'none' }}>Check Render direct build</Link>
          <Link href="/" style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.18)', color: 'white', padding: '0.95rem 1.1rem', fontWeight: 900, textDecoration: 'none' }}>Back to current legacy app</Link>
        </div>
      </section>
    </main>
  )
}
