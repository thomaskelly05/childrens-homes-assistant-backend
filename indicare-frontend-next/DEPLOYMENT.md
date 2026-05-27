# IndiCare OS Frontend Deployment

## Preflight

- Install dependencies: `npm install`
- Type check: `npm run typecheck`
- Build: `npm run build`
- Start locally: `npm run start`
- Health check: `/api/health`

## Environment

Create `.env.local` from `.env.example`.

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=IndiCare OS
NEXT_PUBLIC_ENVIRONMENT=production
```

## Backend dependency

The frontend expects the FastAPI backend to expose existing `/api/*` routes for:

- chronology
- care recording
- safeguarding patterns
- tasks
- assistant
- documents
- operational diagnostics

## Deployment targets

Recommended:

- Vercel for frontend
- Render, Railway or similar for backend
- PostgreSQL for production database
- object storage for documents

## Production checks

- Confirm `/api/health` returns ok
- Confirm backend `/api/os-diagnostics/router-status` returns ok
- Confirm chronology workspace loads records
- Confirm assistant prompts open cleanly
- Confirm mobile navigation renders
- Confirm error boundary works
- Confirm not-found recovery page works
