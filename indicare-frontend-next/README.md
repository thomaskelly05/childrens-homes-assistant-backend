# IndiCare Frontend Next (canonical)

Production Next.js frontend for the Render service **`indicare-frontend-next`**.

This is the single home for the brief-led IndiCare OS experience:

- Story-first young person workspace
- Child-centred operating system shell (`indicare-os-live.css`)
- OS-linked ORB at `/assistant/orb` → `/api/assistant/orb/conversation`
- Typed recording, review queue, manager actions, chronology, documents, plans, handover, LifeEcho, archive

The repository path `frontend-next` is a **symlink** to this folder for backwards-compatible tests and docs.

## Development

```bash
cd indicare-frontend-next
npm install
npm run dev
```

Runs on port **3001** and rewrites `/api/*` to the FastAPI backend (see `next.config.ts`).

## Build

```bash
npm run build
npm run start
```

## ORB diagnostics (dev)

`/assistant/orb/diagnostics` calls `/api/assistant/orb/evidence-diagnostics`. Hidden in production unless `NEXT_PUBLIC_ENABLE_ORB_DIAGNOSTICS=true`.

## Legacy

See [LEGACY_FRONTENDS.md](./LEGACY_FRONTENDS.md).
