export async function GET() {
  return Response.json({
    ok: true,
    runtime: 'indicare-os-next',
    status: 'operational',
    realtime: true,
    continuity: true
  })
}
