# RiskPath: Clinical Risk Console

> Map every patient's risk pathway, explained.

RiskPath is a clinical decision-support platform. Its first module,
**Readmission Risk**, estimates 30-day readmission probability for a single
patient and explains the drivers behind every prediction. Additional modules
(Batch Score, Population Insights, Model Card) are scaffolded as
"Coming Soon" cards in the same shell.

## Quick start

```bash
cp .env.example .env          # then edit VITE_API_BASE_URL
npm install
npm run dev
```

Open http://localhost:5173; you'll be redirected to `/predict`.

## Environment

```
VITE_API_BASE_URL=http://127.0.0.1:8000   # FastAPI backend
# VITE_USE_MOCK_API=true                   # uncomment for offline preview
```

When `VITE_USE_MOCK_API=true`, every API call is served from
`src/lib/mockApi.ts`. The model identifier is suffixed `-MOCK` so the mode
is unmistakable. Mocks are NEVER used as a silent fallback when the real
backend is reachable.

## Backend contract

Five endpoints, served from `VITE_API_BASE_URL`:

| Endpoint                        | Purpose                                    |
| ------------------------------- | ------------------------------------------ |
| `GET  /metadata`                | Feature catalog + model info               |
| `GET  /health`                  | Liveness (polled every 10s)                |
| `GET  /examples?n=5`            | Sample patients                            |
| `POST /predictions?threshold=t` | Score one patient                          |
| `POST /explanations`            | SHAP values + base value for one patient   |

Errors return `{ error: { code, message, details? } }` and surface as toasts.

## Keyboard shortcuts

- `⌘K` / `Ctrl-K`: command palette
- `R`: re-explain (on `/predict`)
- `[` / `]`: previous / next sample patient

## Stack

React 19 · TypeScript · TanStack Start (Router + SSR) · TanStack Query ·
Tailwind v4 · shadcn/ui · Recharts · Framer Motion · cmdk · Sonner.
