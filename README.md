# Turant ⚡

> **You describe the situation. One cart shows up in under 10 seconds. That's it.**

Built for HackOn with Amazon Season 6.0 — Problem Statement 2: *Reimagining Urgent Shopping*.

---

## Why we built this

It's 9pm. Power cut. Husband's BP monitor needs charging. No candles left. You open Amazon Now and stare at a search box.

What do you type? "Emergency stuff"? "Power cut things"? You type "candles" — 30 brands appear, ₹40 to ₹450. You type "power bank" — 80 options. By the 6th minute, the lights are still out and your cart is still empty.

That's the problem. Quick-commerce in India cracked delivery. Nobody cracked the part *before* delivery — the 5 to 15 minutes customers spend translating a situation into product names, at exactly the moment they're least equipped to do that.

**Turant's answer:** stop asking the customer to do product research in a crisis. Let them say what's happening, in whatever language is in their head, and give them one confident cart with reasons.

---

## What it looks like in 30 seconds

```
User types:  "light chali gayi, monsoon hai bahar"

Turant:      Power Cut Kit  [CONFIDENT]
             ─────────────────────────────────
             Candles (pack of 10)       ₹120   ✨ for you
             Your usual brand. Lasts 4–5 hrs.           90%

             Rechargeable LED Bulb      ₹299
             Works 6 hrs on single charge.              88%

             Power Bank 10000mAh        ₹799
             Enough for phone + BP monitor.             85%

             Maggi Atta Noodles (x4)    ₹140   ✨ for you
             Your usual choice for quick meals.         82%

             Cold Drinks Pack           ₹110
             For the heat tonight.                      78%

             TOTAL  ₹1,468  ·  delivery in ~14 min
             [ Order now ]    [ Share on WhatsApp ]
```

No search. No 47 results. No brand comparison. Just a cart with reasons.

---

## Features

### 1. Adaptive Situation Engine

The AI decides how confident to be *before* it responds. Three modes, self-selected:

| What the user says | Mode | What happens |
|---|---|---|
| "light chali gayi, monsoon hai bahar" | **Confident** | Full cart, 5–6 items, each with a reason |
| "kal kuch plan hai" | **Best Guess** | Smaller cart, opens with "Assuming you mean..." |
| "kuch chahiye" | **Clarifying Question** | No cart — one short question back |

The confidence floor is hard-coded at 0.6. If the model can't honestly reach that threshold for enough items, it asks instead of guessing wrong.

### 2. Explainable, Personalized Reasoning

Every item comes with a one-line reason in plain language. When the user has past orders, those preferences surface — *"Maggi — your usual choice"* — with a ✨ badge.

The model picks the products. A deterministic Python layer in Lambda sets the personalization flags by matching item names against the user's brand history. This separation matters: the model is creative, the code is reliable.

### 3. Conversational Refinement

After the cart appears, the user can talk back to it:

> *"Maggi hata do, kuch healthy do"*

The previous cart goes back in the request as context. The model swaps items rather than starting over. The title updates too — *Power Cut Kit → Power Cut Kit (Healthy Edition)*. Everything else stays.

### 4. Cart Battle — Budget vs Premium

For occasion-shopping where the spend level is the actual question:

> *"movie night for 4, budget 500"*

Two carts come back side by side — a ₹500 essentials cart and a ~₹850 upgraded cart with dessert, ice, and better snacks. Personalization applies to both.

### 5. Neighborhood Pulse

A proactive banner on the home screen. When demand in your area spikes for a specific situation — *"18 people in your area ordered Pooja samagri. Festival prep is peaking around you."* — one tap builds that cart immediately.

No new tables needed. In production this would run off CartSessions aggregation. Turant shows what proactive commerce looks like when the app comes to you instead of waiting.

### 6. WhatsApp Share

Cart decisions in Indian households aren't solo. After a cart is generated, one tap opens WhatsApp with a pre-formatted summary — items, prices, total, ETA — plus a link to the cart. The other person can look, approve, or suggest changes before anything is ordered.

### 7. Smart Substitution

If an item in a generated cart is out of stock, Turant doesn't just say "unavailable, remove?" It finds the closest substitute by tag overlap → same category → nearest price, and shows it inline:

> *"Maggi abhi out of stock hai — Yippee rakh diya, similar choice. Theek hai?"*

One tap to approve, one tap to remove. The flow doesn't break.

### 8. Confidence Feedback Loop

Every cart item has a × button. When a user removes an item, that removal is logged as a negative signal against that product in that situation context. The next time the same user builds a cart, removed items are filtered out of consideration unless they explicitly ask for them.

The loop is visible in the demo — order a cart, remove Gulab Jamun, build a guests cart again, and Gulab Jamun won't appear.

---

## Architecture

```
┌─────────────────┐   HTTPS    ┌──────────────────┐   invoke   ┌─────────────────┐
│                 │  ────────▶ │                  │ ─────────▶ │                 │
│  React + Vite   │            │   API Gateway    │            │  Lambda         │
│  (Frontend)     │            │   (REST)         │            │  Python 3.12    │
│                 │  ◀──────── │                  │ ◀───────── │                 │
└─────────────────┘   JSON     └──────────────────┘            └────────┬────────┘
                                                                        │
                                              ┌─────────────────────────┼──────┐
                                              │                         │      │
                                              ▼                         ▼      ▼
                                     ┌─────────────────┐     ┌──────────────────┐
                                     │  DynamoDB        │     │  Amazon Bedrock  │
                                     │  ─ Catalog       │     │  Nova Lite       │
                                     │  ─ UserPrefs     │     │  (Converse API)  │
                                     │  ─ CartSessions  │     └──────────────────┘
                                     │  ─ Playbooks     │
                                     └─────────────────┘
```

One Lambda function handles everything — `parse_and_generate`. The request body's `mode` field (single / battle) and `action` field (substitute / record_removal) route to the right behavior. This keeps cold-start cost minimal and the whole backend auditable in one file.

The model's JSON output goes through a Python validation layer before it ever reaches the frontend. Personalization flags, safety-note enforcement, delivery-note math — none of these are trusted to the model. The code sets them deterministically.

### Why no EC2

Traffic patterns in quick-commerce are bursty. A power cut hits one neighborhood and 500 carts get generated in two minutes, then nothing for an hour. EC2 forces you to either overprovision (waste money when idle) or underprovision (time out during spikes). Lambda absorbs both modes automatically and costs nothing when idle.

### Scale story

| Users | Monthly cost |
|---|---|
| 2 (today, demo) | ₹0 — inside Free Tier |
| 100,000 | ~₹4,500 |
| 10,000,000 | ~₹4.5 lakh |

₹0.45 per cart generated at 10M users. Against a ₹500–1,500 cart value, that's under 0.1% in AI overhead. Nothing needs to be redesigned to get there — Lambda and DynamoDB on-demand scale without intervention.

---

## Tech stack

| Layer | What | Why |
|---|---|---|
| Frontend | React 18 + Vite 5, vanilla CSS | No framework overhead, fast iteration |
| Hosting | AWS Amplify | Free tier, single command deploy |
| API | API Gateway (REST, Lambda Proxy) | 1M calls/month free |
| Compute | AWS Lambda (Python 3.12) | Pay nothing idle, auto-scale on demand |
| AI model | Amazon Nova Lite via Bedrock | 2–3s latency, cheapest frontier model |
| Vision (future) | Claude Sonnet 4.5 via Bedrock | Best at messy real-world photos |
| Database | DynamoDB on-demand | 25GB free, zero provisioning |
| Dev tool | Kiro IDE | Hackathon mandate — actually useful |

The frontend ships with a complete mock backend (`src/mock.js`). If the API is unreachable, the mock auto-takes-over. Demo never breaks live regardless of network.

---

## Repo structure

```
turant/
├── backend/
│   ├── data/
│   │   ├── catalog.json              37 products with name, price, eta_min, tags
│   │   └── user_preferences.json    2 demo profiles (Mrs. Iyer + Aarav)
│   ├── scripts/
│   │   ├── setup_dynamodb.py        creates all 4 DynamoDB tables
│   │   └── seed_data.py             loads catalog + user preferences
│   └── lambda/parse_and_generate/
│       ├── lambda_function.py       all 8 features in one engine
│       └── requirements.txt         just boto3 — no external deps
├── frontend/
│   └── src/
│       ├── App.jsx                  main app + routing
│       ├── api.js                   API client + mock fallback
│       ├── mock.js                  offline safety net
│       ├── catalog.js               findSubstitute() logic
│       └── components/
│           ├── Cart.jsx             cart display + Share button + × removal
│           ├── BattleCarts.jsx      budget vs premium side-by-side
│           ├── RefineBar.jsx        conversational refinement input
│           ├── NeighborhoodPulse.jsx proactive demand banner
│           └── SmartSubstitution.jsx out-of-stock swap prompt
├── docs/
│   ├── PRD-Turant.md               full product requirements
│   └── HANDOFF.md                  deployment + testing checklist
├── setup_api_gateway.sh            one-shot API Gateway provisioner
└── README.md
```

---

## Running it locally

### What you need first

- AWS account with Bedrock access enabled for `amazon.nova-lite-v1:0` in `us-east-1`
- AWS CLI v2 configured (`aws configure`)
- Node 18+ and Python 3.12+

### Step 1 — Set up DynamoDB tables and seed data

```bash
git clone https://github.com/Iam-raunac/turant.git
cd turant

python3 -m venv venv
source venv/bin/activate
pip install boto3

cd backend/scripts
python3 setup_dynamodb.py
python3 seed_data.py
```

After this you'll have four tables in DynamoDB: `Catalog` (37 products), `UserPreferences` (2 profiles), `SituationPlaybooks`, and `CartSessions`.

### Step 2 — Deploy the Lambda

Create a Lambda named `parse_and_generate` in `us-east-1`. Give its execution role DynamoDB full access and Bedrock full access. Then:

```bash
cd ../lambda/parse_and_generate
zip lambda_deploy.zip lambda_function.py

aws lambda update-function-code \
  --function-name parse_and_generate \
  --zip-file fileb://lambda_deploy.zip \
  --region us-east-1

aws lambda update-function-configuration \
  --function-name parse_and_generate \
  --timeout 30 \
  --memory-size 256 \
  --region us-east-1
```

### Step 3 — Provision API Gateway

One script handles the whole thing — REST API, /parse-cart resource, POST + OPTIONS methods, Lambda integration, CORS, and deployment to `prod`:

```bash
cd ../../..
bash setup_api_gateway.sh
```

It prints your invoke URL at the end and writes it to `api_url.txt`.

### Step 4 — Test the API directly

```bash
# Basic situation
curl -X POST "$(cat api_url.txt)" \
  -H "Content-Type: application/json" \
  -d '{"user_text": "light chali gayi, monsoon hai bahar"}'

# With personalization
curl -X POST "$(cat api_url.txt)" \
  -H "Content-Type: application/json" \
  -d '{"user_text": "mehmaan aa rahe hain", "user_id": "demo_user_1"}'

# Cart Battle mode
curl -X POST "$(cat api_url.txt)" \
  -H "Content-Type: application/json" \
  -d '{"user_text": "movie night for 4", "mode": "battle", "budget_inr": 500}'
```

### Step 5 — Run the frontend

```bash
cd frontend
npm install

cat > .env.local << EOF
VITE_API_URL=$(cat ../api_url.txt)
VITE_USE_MOCK=0
EOF

npm run dev
```

Open `http://localhost:5173`. Type any situation in any language and tap **Build my cart**.

To see personalization in action: click "Switch user" → select Amrit → build a guests cart → notice the ✨ badges and "your usual choice" reasons.

---

## API reference

`POST /parse-cart`

**Request body:**

```json
{
  "user_text": "light chali gayi, monsoon hai bahar",
  "user_id": "demo_user_1",
  "previous_cart": null,
  "mode": "single",
  "budget_inr": null,
  "action": null
}
```

| Field | Required | Notes |
|---|---|---|
| `user_text` | Yes | Any language, ≤500 chars |
| `user_id` | No | `demo_user_1` or `demo_user_2` for personalized carts |
| `previous_cart` | No | Pass previous response object to refine instead of rebuild |
| `mode` | No | `"single"` (default) or `"battle"` |
| `budget_inr` | No | Budget target for battle mode |
| `action` | No | `"substitute"` or `"record_removal"` for feedback features |

**Single mode response:**

```json
{
  "response_type": "confident",
  "cart_title": "Power Cut Kit",
  "situation_understood": "Power outage during monsoon rain.",
  "clarifying_question": null,
  "items": [
    {
      "product_id": "P004",
      "name": "Maggi Atta Noodles (pack of 4)",
      "reason": "Maggi — your usual choice for quick meals.",
      "confidence": 0.9,
      "price_inr": 140,
      "eta_min": 12,
      "personalized": true
    }
  ],
  "safety_note": null,
  "delivery_note": null,
  "personalization_applied": true,
  "total_inr": 1418
}
```

**Battle mode response:** same shape but `carts` is an array of two objects tagged `tier: "budget"` and `tier: "premium"`.

---

## What we hard-coded and why

Some things weren't left to the model's discretion:

**No dosages, no diagnoses.** The system prompt instructs the model to never suggest these. The Lambda validates that health carts don't contain anything resembling medical advice before the response goes out.

**Quick Health safety note is non-negotiable.** The exact OTC disclaimer string is a constant in the Lambda. If the model writes something different, the post-processor replaces it. Judges can verify this in `lambda_function.py` — it's one of the first constants defined.

**Delivery flag only fires for items strictly over 20 minutes.** Items at 12–18 min are standard Amazon Now speed and don't get flagged. We ran into a bug where the model was flagging 15-minute items — fixed by moving the check to Python where the math is exact.

**Personalization flags are set by Python, not the model.** The model picks the right products. A separate function then scans every item name against `favorite_brands` from DynamoDB and sets `personalized: true` deterministically. The model doesn't guess at metadata.

---

## Demo users

Two profiles are seeded and ready to use:

**demo_user_1 — Amrit** — has past orders for Xbox Controller, Naan, Cold Drinks, Maggi, Coca-Cola, Candles. Guests and Power Cut carts will surface these with ✨ badges.

**demo_user_2 — Mrs. Iyer** — senior, husband on BP medication. Power Cut cart includes a power bank specifically because of the medical device context. Her favorite brands steer the AI toward familiar choices.

Switch between them using "Switch user" on the home screen. The anonymous mode still works — it just skips personalization.

---

## What we didn't build (and why)

**Photo input.** The architecture supports it — Claude Sonnet 4.5 is configured in the Lambda for vision. We cut it at Hour 36 when we realized a shaky live demo of photo recognition is worse than no photo demo. It's in the roadmap, not the demo.

**Voice input.** Same call. AWS Transcribe + Polly are in the architecture. Hindi transcription works. But live microphone demos have latency spikes that kill momentum in judging. Pre-recorded fallback felt dishonest. We cut it.

**Prescription medicines.** On purpose. OTC only — the things Blinkit and Zepto already deliver today. Prescription handling needs Amazon Pharmacy's licensing infrastructure, not a quick-commerce AI assistant.

**Real payments and delivery.** Out of scope for what this hackathon is testing. The confirmation screen says so explicitly.

---

## Roadmap

**0–3 months** — Expand from 7 to 50+ situation playbooks. Personalization from tile-tap patterns. Tamil, Telugu, Bengali, Marathi rollout.

**3–6 months** — Festival Auto-Mode (Diwali kit suggestion 3 days before Diwali). Family Group Carts (mom approves from her phone before checkout). Weather-triggered suggestions. Power-grid data integration.

**6–12 months** — Alexa: *"Alexa, light chali gayi"* → cart on your phone. Pantry photo → weekly restock cart. Hyperlocal demand detection.

**1 year+** — Cross-category situations ("wedding in family" → groceries + gifts + travel). B2B version for kirana restocking. Open Situations API for Amazon Fresh, Business, Pharmacy to plug into. Prescription integration through Amazon Pharmacy's existing infrastructure when the regulatory path is clear.

---

## Built by

**[Raunak Kumar](https://github.com/Iam-raunac)** — backend architecture, Bedrock prompts, DynamoDB schema, all 4 Lambda feature engines, frontend integration, API Gateway setup, all new feature components.

**Co-builder** — product design, PPT, demo video, submission.

48 hours. Real AWS infrastructure throughout — no stubs, no mocks in production path. Mock only as a frontend safety net if the API goes down during judging.

---

## The one question we kept asking ourselves

> *"Does this make Mrs. Iyer's 9pm power-cut moment easier?"*

Every feature we built, every feature we cut — it came down to this.

If yes → build it.
If no → drop it, however clever it seemed.

That's what "start with the customer" actually means in practice.