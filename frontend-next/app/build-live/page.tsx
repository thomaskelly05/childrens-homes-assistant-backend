import Link from 'next/link'

export default function CanonicalBuildLivePage() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem', background: 'linear-gradient(180deg,#f8fbff,#eaf2fb)', color: '#07111f', fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
      <section style={{ maxWidth: 1080, margin: '6vh auto 0', border: '1px solid rgba(148,163,184,0.24)', borderRadius: 36, padding: 'clamp(1.5rem,4vw,3rem)', background: 'rgba(255,255,255,0.9)', boxShadow: '0 24px 80px rgba(15,23,42,0.08)' }}>
        <p style={{ color: '#2563eb', fontSize: 12, fontWeight: 950, letterSpacing: '0.28em', textTransform: 'uppercase' }}>Canonical live front door</p>
        <h1 style={{ margin: '1rem 0 0', fontSize: 'clamp(2.8rem,8vw,6rem)', lineHeight: 0.95, letterSpacing: '-0.08em' }}>
          frontend-next is the one IndiCare OS.
        </h1>
        <p style={{ marginTop: '1.25rem', maxWidth: 820, color: '#53637a', fontSize: '1.05rem', lineHeight: 1.75 }}>
          This page confirms the live service is using the single production front door: frontend-next. The separate indicare-frontend-next folder is parked for reference and is not the live build target.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 24 }}>
          {[
            ['Runtime', 'frontend-next'],
            ['Domain', 'app.indicare.co.uk'],
            ['Build target', 'Render rootDir: frontend-next'],
            ['ORB route', '/api/assistant/orb/conversation']
          ].map(([label, value]) => (
            <div key={label} style={{ borderRadius: 20, border: '1px solid rgba(148,163,184,0.2)', background: '#f8fbff', padding: '1rem' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, fontWeight: 950, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</p>
              <strong style={{ display: 'block', marginTop: 8 }}>{value}</strong>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <Link href="/" style={{ borderRadius: 18, background: '#2563eb', color: 'white', padding: '0.95rem 1.1rem', fontWeight: 900, textDecoration: 'none' }}>Open IndiCare OS</Link>
          <Link href="/young-people/1/workspace" style={{ borderRadius: 18, border: '1px solid rgba(37,99,235,0.18)', color: '#1d4ed8', padding: '0.95rem 1.1rem', fontWeight: 900, textDecoration: 'none' }}>Open child workspace</Link>
          <Link href="/assistant/orb" style={{ borderRadius: 18, border: '1px solid rgba(37,99,235,0.18)', color: '#1d4ed8', padding: '0.95rem 1.1rem', fontWeight: 900, textDecoration: 'none' }}>Open OS ORB</Link>
        </div>
      </section>
    </main>
  )
}
