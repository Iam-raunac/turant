# Turant — Frontend

React + Vite app for **Turant — Confident Mode for Amazon Now**.
Talks to the `parse_and_generate` Lambda via API Gateway and renders the
4 locked features end-to-end.

## What's wired up

- **Feature 1** — three response modes (confident / best_guess / clarifying_question), each rendered with its own visual treatment.
- **Feature 2** — profile switcher (Anonymous / Mrs. Iyer / Aarav). Personalized items show a `✨ for you` badge.
- **Feature 3** — refine bar appears under any cart. Quick-pick chips for common refinements.
- **Feature 4** — Cart Battle toggle + budget input. Renders Budget vs Premium side-by-side on tablet+.

A bundled **mock backend** (`src/mock.js`) automatically takes over if `VITE_API_URL` is empty or the Lambda call fails. This is the demo safety net referenced in the PRD.

## Run locally

```bash
cd frontend
npm install
cp .env.example .env.local
# edit .env.local — paste your API Gateway URL into VITE_API_URL
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

If you don't have the API Gateway URL yet, leave `VITE_API_URL` blank.
The app will run against the mock and is fully clickable.

## Build for deploy

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ locally on :4173
```

The `dist/` folder is what you upload to Amplify Hosting (or any static host — S3 + CloudFront, Vercel, Netlify all work).

## Deploying to AWS Amplify (PRD-mandated)

Two ways:

**Drag-and-drop (fastest for the demo):**
1. Run `npm run build` locally.
2. AWS Console → Amplify Hosting → New app → Deploy without Git provider.
3. Drag the `dist/` folder in. Done — you get a `*.amplifyapp.com` URL.
4. Before the upload step, set the env var `VITE_API_URL` so the build can pick it up. Or just bake it into `.env.production` before running the build.

**Connected to GitHub (auto-rebuild):**
1. Amplify Console → Connect a repo → choose `iam-raunac/turant`, branch `main`.
2. App root: `frontend`.
3. Build settings: detect Vite, or paste:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd frontend
           - npm ci
       build:
         commands:
           - cd frontend
           - npm run build
     artifacts:
       baseDirectory: frontend/dist
       files:
         - '**/*'
   ```
4. Add `VITE_API_URL` under env variables.

## API contract

This frontend POSTs the same JSON the Lambda already accepts:

```json
{
  "user_text": "light chali gayi, monsoon hai bahar",
  "user_id": "demo_user_1",
  "previous_cart": { /* optional, for refinement */ },
  "mode": "single",
  "budget_inr": 500
}
```

If the API Gateway is set up as Lambda Proxy integration, the response
shape is `{ statusCode, headers, body }` where `body` is a stringified
JSON. `api.js` handles both wrapped and unwrapped responses.

## File map

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api.js          ← API Gateway client + mock fallback
    ├── mock.js         ← Local mock responses (demo safety net)
    ├── styles.css
    └── components/
        ├── Header.jsx
        ├── HeroInput.jsx
        ├── SampleChips.jsx
        ├── ProfileSwitcher.jsx
        ├── ModeToggle.jsx
        ├── Loading.jsx
        ├── Cart.jsx
        ├── BattleCarts.jsx
        ├── ClarifyingQuestion.jsx
        ├── RefineBar.jsx
        ├── OrderConfirmation.jsx
        └── ErrorBanner.jsx
```
