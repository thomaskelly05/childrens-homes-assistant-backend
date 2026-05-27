export async function GET() {
  return Response.json({
    ok: true,
    app: 'indicare-frontend-next',
    runtime: 'canonical-brief-led-os',
    status: 'live'
  })
}
