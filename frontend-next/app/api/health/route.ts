export async function GET() {
  return Response.json({
    ok: true,
    service: 'frontend-next',
    status: 'operational'
  })
}
