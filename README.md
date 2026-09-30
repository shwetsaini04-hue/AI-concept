# Transcript AI Lab

An interactive learning platform for NLP, LLM engineering, evaluation and information extraction on noisy (Hinglish) call-centre transcripts. 33 lessons with interactive labs, quizzes, spaced review, a mistake log and a scored capstone.

## Run the frontend

Requires Node.js 20+.

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Everything works in the browser; progress is saved in localStorage.

## Optional: backend (real model calls + progress sync)

Requires Python 3.11+.

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # add API keys if you want real LLM calls
uvicorn app.main:app --port 8000
```

Then create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000` and restart the frontend.

## Deploy on Vercel

`vercel.json` deploys both parts as one project with two services on one domain:

- `/api/*` → `backend` (FastAPI, `backend/app/main.py`)
- everything else → `frontend` (Next.js)

Environment variables (Project → Settings → Environment Variables):

| Variable | Needed? | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | only to enable the backend | `/` (same origin) |
| `DATABASE_URL` | recommended with the backend | hosted Postgres URL (e.g. Neon); without it progress sync doesn't persist |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | optional | enables real model calls in the labs |
| `CORS_ORIGINS` | no | same origin, not needed |

Local test of the combined setup: `vercel dev` from the repo root.

## Checks

```bash
cd frontend
npm test                                  # algorithm tests
npx tsx scripts/check-content.ts          # lesson/question integrity
npx tsx scripts/check-sim.ts              # prompt simulator + capstone rubric
```

`node_modules/`, `.next/` and other generated folders are git-ignored; `npm install` recreates them.
