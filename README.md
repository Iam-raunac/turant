# Turant

> **One confident cart in under 10 seconds. No searching. No 47 results.**

Turant is a "Confident Mode" for [Amazon Now](https://www.amazon.in/) — built for the moments when you don't want to *shop*, you just want the thing fixed. The power went out, guests are at the door in twenty minutes, the kid has a fever, you forgot it's Karva Chauth tomorrow.

You type what's happening in whatever language is in your head — "light chali gayi, monsoon hai bahar" — and you get back one cart. Five items. Each with a one-line reason for being there. Total at the bottom. Order button.

Built in 48 hours for **HackOn with Amazon Season 6.0**, Problem Statement 2 (*Reimagining Urgent Shopping*).

---

## The problem we actually went after

Quick-commerce in India is fast at delivery and slow at deciding. Apps still expect you to translate a situation into product names — *candles? what wattage? how many mAh power bank? which brand?* — at exactly the moment you're least equipped to do that translation. We watched our own families do this. A 9pm power cut in Chennai. A mother-in-law calling about pooja samagri. A hostel kid running a fever the night before an exam. In every case the bottleneck isn't logistics. It's the 5–15 minutes spent staring at search results.

The Amazon Now problem statement asks how to make urgent shopping *fastest and most effortless*. Our answer: stop asking customers to do product research in a crisis. Let them describe the situation, and the cart should already know.

---

## What it does

Four features, all live, all end-to-end on real AWS infrastructure.

### 1. Adaptive Situation Engine

The model decides *how confident it should be* before responding. Three modes:

| User says | Mode | What happens |
|---|---|---|
| *"light chali gayi, monsoon hai bahar"* | **Confident** | One full cart, 5–6 items, each with a reason |
| *"kal kuch plan hai, suggest karo"* | **Best Guess** | Smaller tentative cart, opens with "Assuming you're..." |
| *"kuch chahiye"* | **Clarifying Question** | No cart — one short question back, in Hindi if appropriate |

The model self-selects. Confidence floor is hard-coded: if it can't honestly assign ≥0.6 confidence to enough items, it falls back to asking instead of guessing wrong.

### 2. Explainable, Personalized Reasoning

Every item carries a one-line *reason*. When a user has known brand preferences, those preferences show up in the reasoning — *"Maggi — your usual choice for quick meals"* — and items get a `personalized: true` flag the UI uses to show a ✨ badge.

We don't trust the model to remember to do this. A deterministic post-processing layer in the Lambda matches every item name against the user's `favorite_brands` and sets the flags itself. The model is good at picking products. The code guarantees the metadata is right.

Two demo profiles ship in the seed data:
- **Mrs. Iyer** — senior citizen in Chennai, husband on BP medication. Cart adjusts to include a power bank for the BP monitor during outages.
- **Aarav** — Delhi hostel student. Cart leans toward Maggi, Parle-G, Coca-Cola — his actual purchase history.

### 3. Conversational Refinement

After a cart is returned, you can talk back to it. *"Maggi hata do, kuch healthy do."* The previous cart is sent in the next request as `previous_cart`, and the model swaps items rather than starting from scratch. The Maggi disappears, a paneer or energy bar takes its place, everything else stays put. Title even auto-updates: *Power Cut Kit → Power Cut Kit (Healthy Edition)*.

### 4. Cart Battle — Budget vs Premium

For occasion-shopping, the user can ask for two cart options at different spend tiers. *"Movie night for 4, budget 500."* The response comes back as two carts side-by-side: a ₹500 "Budget" cart (essentials) and a ~₹850 "Premium" cart (adds dessert, ice, upgrades). Personalization applies to both.

---

## Architecture

End-to-end AWS-native. Fully serverless. Sits inside the Free Tier today, scales linearly without redesign.

```
┌──────────────┐    HTTPS    ┌──────────────┐    invoke    ┌──────────────┐
│              │   ─────▶    │              │   ────────▶  │              │
│  React +     │             │  API Gateway │              │   Lambda     │
│  Vite (UI)   │             │  (REST)      │              │  (Python)    │
│              │   ◀─────    │              │   ◀────────  │              │
└──────────────┘    JSON     └──────────────┘              └──────┬───────┘
                                                                  │
                                          ┌───────────────────────┼─────┐
                                          │                       │     │
                                          ▼                       ▼     ▼
                                   ┌──────────────┐        ┌──────────────┐
                                   │  DynamoDB    │        │  Bedrock     │
                                   │  Catalog     │        │  Nova Lite   │
                                   │  UserPrefs   │        │  (Converse)  │
                                   └──────────────┘        └──────────────┘
```

**Why these pieces:**

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite, AWS Amplify Hosting | Fast iteration, free tier, mobile-first styling |
| API | API Gateway (REST, Lambda Proxy) | First million calls/month free, no servers to manage |
| Compute | Lambda (Python 3.12) | Pay nothing when idle; 256 MB / 30s timeout per call |
| AI | Bedrock Converse API + Nova Lite | Cheapest fast frontier model; 2–3s typical latency |
| Data | DynamoDB on-demand | 25 GB free, no provisioning |
| Catalog | 37 curated products with `eta_min` field | Models real Amazon Now SKU shape |

A single Lambda — `parse_and_generate` — handles all four features. Mode is selected by the request body. The model's JSON output is validated and enriched by deterministic Python (personalization flags, safety-note conformance, delivery-note math) before the response goes back, so the contract the frontend sees is stable even when the model is creative.

### Why this scales

Today at our two demo users, the system costs literally ₹0. At 10M Indian customers it costs roughly ₹4.5 lakh/month — about ₹0.45 per cart generated, well under 0.1% of the cart value. We don't have to redesign anything; Lambda goes from a handful of concurrent executions to a few thousand and DynamoDB on-demand absorbs the rest.

---

## Tech stack

**Frontend** — React 18, Vite 5, vanilla CSS (no framework). Built as a single-page app with a bundled mock backend (`src/mock.js`) that auto-takes-over if the API is unreachable, so the demo never breaks live.

**Backend** — Python 3.12 on Lambda, `boto3` for DynamoDB and Bedrock. Single-file handler (`lambda_function.py`), no external dependencies beyond the AWS SDK that's already in the Lambda runtime.

**AI** — Amazon Nova Lite via Bedrock Converse API. Temperature 0.3 for deterministic-enough outputs. Prompt is structured in five strict steps (situation parsing → response mode → item selection → safety rule → delivery rule) with the schema enforced at the prompt level *and* validated again in Python.

**Infra** — Everything in `us-east-1`. All scripts AWS-CLI-driven (no Console clicking required to reproduce). One bash script provisions the entire API Gateway stack including CORS.

---

## What's in this repo

```
turant/
├── backend/
│   ├── data/
│   │   ├── catalog.json                 ─ 37 products with name, price, eta_min, tags
│   │   └── user_preferences.json        ─ 2 demo profiles (Mrs. Iyer, Aarav)
│   ├── scripts/
│   │   ├── setup_dynamodb.py            ─ creates Catalog, UserPreferences, etc.
│   │   └── seed_data.py                 ─ loads catalog + user prefs into DynamoDB
│   └── lambda/parse_and_generate/
│       ├── lambda_function.py           ─ all 4 features in one engine (v7)
│       └── requirements.txt             ─ just boto3
├── frontend/
│   ├── src/
│   │   ├── App.jsx                      ─ main app + state
│   │   ├── api.js                       ─ API Gateway client + mock fallback
│   │   ├── mock.js                      ─ offline demo safety net
│   │   └── components/                  ─ Cart, BattleCarts, RefineBar, etc.
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── PRD-Turant.md                    ─ full product requirements document
│   └── HANDOFF.md                       ─ deployment + testing checklist
├── setup_api_gateway.sh                 ─ one-shot API Gateway provisioner
└── README.md
```

---

## Getting it running locally

### Prerequisites

- AWS account with Bedrock access enabled for Amazon Nova Lite in `us-east-1`
- AWS CLI v2 configured (`aws configure`)
- Node 18+ and Python 3.12+
- About 10 minutes

### 1. Backend — DynamoDB + Lambda

```bash
# Clone and enter
git clone https://github.com/Iam-raunac/turant.git
cd turant

# Set up Python venv
python3 -m venv venv
source venv/bin/activate
pip install boto3

# Create tables and seed
cd backend/scripts
python3 setup_dynamodb.py
python3 seed_data.py
```

You should see `Catalog` (37 items), `UserPreferences` (2 profiles), and `SituationPlaybooks` tables in DynamoDB.

### 2. Deploy the Lambda

Create a Lambda function in `us-east-1` named `parse_and_generate`. Give the execution role permissions for **DynamoDB full access** and **Bedrock full access**. Then:

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

### 3. Provision the API Gateway

One script does the whole thing — REST API, resource, POST + OPTIONS methods, Lambda integration, permissions, CORS, deployment to `prod`:

```bash
cd ../../..
bash setup_api_gateway.sh
```

At the end it prints your invoke URL and writes it to `api_url.txt`:

```
https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/parse-cart
```

### 4. Test it from the terminal

```bash
curl -X POST "$(cat api_url.txt)" \
  -H "Content-Type: application/json" \
  -d '{"user_text":"light chali gayi, monsoon hai bahar"}'
```

You should see a JSON cart with `response_type: "confident"`, `cart_title: "Power Cut Kit"`, and 5–6 items.

### 5. Run the frontend

```bash
cd frontend
npm install

cat > .env.local <<EOF
VITE_API_URL=$(cat ../api_url.txt)
VITE_USE_MOCK=0
EOF

npm run dev
```

Open `http://localhost:5173`. Type "light chali gayi, monsoon hai bahar" and tap **Build my cart**.

---

## API contract

`POST /parse-cart`

**Request:**

```json
{
  "user_text": "light chali gayi, monsoon hai bahar",
  "user_id": "demo_user_1",
  "previous_cart": null,
  "mode": "single",
  "budget_inr": 500
}
```

- `user_text` (required, ≤500 chars) — the situation, in any language
- `user_id` (optional) — `demo_user_1` (Mrs. Iyer) or `demo_user_2` (Aarav) for personalization
- `previous_cart` (optional) — pass the last response back to refine instead of regenerate
- `mode` (optional) — `"single"` (default) or `"battle"`
- `budget_inr` (optional, battle mode only) — target spend for the budget cart

**Response — single mode:**

```json
{
  "response_type": "confident",
  "cart_title": "Power Cut Kit",
  "situation_understood": "Power outage during monsoon...",
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

**Response — battle mode:** same shape, but `carts` is an array of two cart objects, each tagged `tier: "budget"` or `tier: "premium"`.

---

## Hard rules we built in

A few things were not negotiable in the prompt, and are double-checked in code:

- **No dosages, no diagnoses, ever.** The model is instructed never to suggest these. We don't ship a medical-advice tool, we ship a context-aware shopping one.
- **Quick Health items always carry the OTC safety disclaimer.** Exact string, validated against a constant in the Lambda — if the model writes something different, the post-processor strips it.
- **Delivery note only flags items strictly slower than 20 minutes.** Items at 12–18 min are normal Amazon Now speeds and never get flagged.
- **No prescription medicines.** Scope is OTC only — the things quick-commerce apps in India already deliver today.

---

## Roadmap

**0–3 months.** Expand from 7 to 50+ situation playbooks (festival-specific, regional, seasonal). Personalization from tile-tap history. Tamil, Telugu, Bengali, Marathi rollout.

**3–6 months.** Festival Auto-Mode (cart suggested three days before Diwali). Family Group Carts (mother-in-law approves from her phone). Weather-triggered prompts. Power-grid data integration for proactive outage notifications.

**6–12 months.** Alexa integration — *"Alexa, light chali gayi"* → cart on your phone. Pantry photo → weekly cart. Hyperlocal outage detection.

**Beyond a year.** Cross-category situations like "wedding in family". B2B for kirana shops. Open Situations API for other Amazon services to plug in. Prescription integration through Amazon Pharmacy's existing licensing infrastructure.

The full PRD is in [`docs/PRD-Turant.md`](docs/PRD-Turant.md).

---

## Built by

**[Raunak Kumar](https://github.com/Iam-raunac)** — backend, Bedrock prompts, catalog/playbook data, infra automation, frontend integration.

**[Co-builder]** — PPT, demo video, submission materials.

Built in 48 hours for HackOn with Amazon Season 6.0. Free tier credits courtesy of Amazon's hackathon track. Everything you see runs on real AWS Bedrock, real DynamoDB, real API Gateway — not stubs.

---

## The compass we kept coming back to

> *Fall in love with the problem, not the technology.*

Every time we had a decision to make in those 48 hours — a feature to add, an animation to write, a tech choice to argue about — we asked ourselves one question:

**"Does this make Mrs. Iyer's 9pm power-cut moment easier?"**

If yes, build it. If no, drop it, however clever it was.

That was the whole compass.
