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

The AI decides how confident to be *before* it responds. It's binary — no wishy-washy middle:

| What the user says | Mode | What happens |
|---|---|---|
| "light chali gayi, monsoon hai bahar" | **Confident** | Full cart, 3–6 items, each with a reason |
| "kuch chahiye" | **Clarifying Question** | No cart — one short question back |

The confidence floor is hard-coded at 0.6. If the model can't honestly pick at least 3 relevant items above that threshold, it asks one question instead of guessing wrong. "I know exactly what you need" or "let me ask one thing first" — nothing in between.

### 2. Explainable, Personalized Reasoning

Every item comes with a one-line reason in plain language. When the user has past orders, those preferences surface — *"Maggi — your usual choice"* — with a ✨ badge.

The model picks the products. A deterministic Python layer in Lambda sets the personalization flags by matching item names against the user's brand history. This separation matters: the model is creative, the code is reliable.

**Critical rule:** Past order history personalizes *item selection*, never the *situation identification*. If a user says "shaam ho gayi kuch khane ka man" (evening, hungry), the cart title is "Evening Snacks" — not "Power Cut Kit" even if they often order candles. The situation comes from the current message, not from what they bought before.

### 3. Conversational Refinement

After the cart appears, the user can talk back to it:

> *"Maggi hata do, kuch healthy do"*

The previous cart goes back in the request as context. The model swaps items rather than starting over. The title updates too — *Power Cut Kit → Power Cut Kit (Healthy Edition)*. Everything else stays.

### 4. Smart Substitution

If an item in a generated cart is out of stock, Turant doesn't just say "unavailable, remove?" It finds the closest substitute by tag overlap → same category → nearest price, and shows it inline:

> *"Maggi abhi out of stock hai — Yippee rakh diya, similar choice. Theek hai?"*

One tap to approve, one tap to remove. The flow doesn't break.

### 5. Confidence Feedback Loop

Every cart item has a × button. When a user removes an item, that removal is logged as a negative signal against that product in that situation context. The next time the same user builds a cart, removed items are filtered out of consideration unless they explicitly ask for them.

The loop is visible in the demo — order a cart, remove Gulab Jamun, build a guests cart again, and Gulab Jamun won't appear.

### 6. Proactive — Time-of-day Routine Anticipation

The home screen anticipates the household rhythm using only the real device clock — no fake telemetry. Morning surfaces pooja + breakfast essentials, evening suggests *chai & snacks*, late night sets up next-day milk and bread. One tap runs the suggestion through the same Adaptive Situation Engine, so the cart is real, not canned.

### 7. Proactive — Reorder / Replenishment Prediction

Turant timestamps every order and knows the typical replenishment cycle for each consumable. When something the user buys regularly is likely running low, it offers a one-tap reorder built entirely from their own data:

> *"You bought Candles about 22 days ago — it's likely run out by now. Reorder?"*

Durable goods (power banks, bulbs, batteries) are deliberately excluded so the user is never nagged to "reorder" a one-off purchase. Tapping reorder builds a cart from the prediction directly — no LLM guess involved. Sign in as a demo profile (Mrs. Iyer / Aarav) to see it fire on their seeded history.

### 8. WhatsApp Share

Cart decisions in Indian households aren't solo. After a cart is generated, one tap opens WhatsApp with a pre-formatted summary — items, prices, total, ETA — plus a link to the cart. The other person can look, approve, or suggest changes before anything is ordered.

---

## Architecture

<<<<<<< HEAD
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
=======
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

One Lambda function handles everything — `parse_and_generate`. The request body's `action` field (`generate` / `substitute` / `record_order` / `record_removal` / `get_profile`) routes to the right behavior. This keeps cold-start cost minimal and the whole backend auditable in one file.

The model's JSON output goes through a Python validation layer before it ever reaches the frontend. Personalization flags, safety-note enforcement, delivery-note math — none of these are trusted to the model. The code sets them deterministically.

### Key Design Principle: Situation vs Personalization

The system strictly separates *what* the user needs (situation) from *which variant* they prefer (personalization):

- **Situation identification:** Comes ONLY from the current message. "Shaam ho gayi kuch khane ka man" → Evening Snacks cart, regardless of order history.
- **Item personalization:** Uses past orders to prefer Maggi over Yippee, Coca-Cola over Pepsi, etc. — but only for items that already fit the situation.

This prevents the common personalization mistake where a user who often orders candles gets a "Power Cut Kit" when they're actually just hungry. Past orders inform choices, never the problem definition.

### Why no EC2

Traffic patterns in quick-commerce are bursty. A power cut hits one neighborhood and 500 carts get generated in two minutes, then nothing for an hour. EC2 forces you to either overprovision (waste money when idle) or underprovision (time out during spikes). Lambda absorbs both modes automatically and costs nothing when idle.

### Scale story

| Users | Monthly cost |
|---|---|
| 2 (today, demo) | ₹0 — inside Free Tier |
| 100,000 | ~₹4,500 |
| 10,000,000 | ~₹4.5 lakh |

₹0.45 per cart generated at 10M users. Against a ₹500–1,500 cart value, that's under 0.1% in AI overhead. Nothing needs to be redesigned to get there — Lambda and DynamoDB on-demand scale without intervention.
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

---

## Tech stack

<<<<<<< HEAD
**Frontend** — React 18, Vite 5, vanilla CSS (no framework). Built as a single-page app with a bundled mock backend (`src/mock.js`) that auto-takes-over if the API is unreachable, so the demo never breaks live.

**Backend** — Python 3.12 on Lambda, `boto3` for DynamoDB and Bedrock. Single-file handler (`lambda_function.py`), no external dependencies beyond the AWS SDK that's already in the Lambda runtime.

**AI** — Amazon Nova Lite via Bedrock Converse API. Temperature 0.3 for deterministic-enough outputs. Prompt is structured in five strict steps (situation parsing → response mode → item selection → safety rule → delivery rule) with the schema enforced at the prompt level *and* validated again in Python.

**Infra** — Everything in `us-east-1`. All scripts AWS-CLI-driven (no Console clicking required to reproduce). One bash script provisions the entire API Gateway stack including CORS.

---

## What's in this repo
=======
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
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

```
turant/
├── backend/
│   ├── data/
<<<<<<< HEAD
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
=======
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
│           ├── RefineBar.jsx        conversational refinement input
│           ├── RoutineSuggestion.jsx   time-of-day proactive suggestion
│           ├── ReorderSuggestion.jsx   replenishment-prediction reorder card
│           └── SmartSubstitution.jsx out-of-stock swap prompt
├── docs/
│   ├── PRD-Turant.md               full product requirements
│   └── HANDOFF.md                  deployment + testing checklist
├── setup_api_gateway.sh            one-shot API Gateway provisioner
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b
└── README.md
```

---

<<<<<<< HEAD
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
=======
## Running it locally

### What you need first

- AWS account with Bedrock access enabled for `amazon.nova-lite-v1:0` in `us-east-1`
- AWS CLI v2 configured (`aws configure`)
- Node 18+ and Python 3.12+

### Step 1 — Set up DynamoDB tables and seed data

```bash
git clone https://github.com/Iam-raunac/turant.git
cd turant

>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b
python3 -m venv venv
source venv/bin/activate
pip install boto3

<<<<<<< HEAD
# Create tables and seed
=======
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b
cd backend/scripts
python3 setup_dynamodb.py
python3 seed_data.py
```

<<<<<<< HEAD
You should see `Catalog` (37 items), `UserPreferences` (2 profiles), and `SituationPlaybooks` tables in DynamoDB.

### 2. Deploy the Lambda

Create a Lambda function in `us-east-1` named `parse_and_generate`. Give the execution role permissions for **DynamoDB full access** and **Bedrock full access**. Then:
=======
After this you'll have four tables in DynamoDB: `Catalog` (37 products), `UserPreferences` (2 profiles), `SituationPlaybooks`, and `CartSessions`.

### Step 2 — Deploy the Lambda

Create a Lambda named `parse_and_generate` in `us-east-1`. Give its execution role DynamoDB full access and Bedrock full access. Then:
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

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

<<<<<<< HEAD
### 3. Provision the API Gateway

One script does the whole thing — REST API, resource, POST + OPTIONS methods, Lambda integration, permissions, CORS, deployment to `prod`:
=======
### Step 3 — Provision API Gateway

One script handles the whole thing — REST API, /parse-cart resource, POST + OPTIONS methods, Lambda integration, CORS, and deployment to `prod`:
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

```bash
cd ../../..
bash setup_api_gateway.sh
```

<<<<<<< HEAD
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
=======
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

# Fetch a profile (includes reorder suggestions)
curl -X POST "$(cat api_url.txt)" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_profile", "user_id": "demo_user_1"}'
```

### Step 5 — Run the frontend
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

```bash
cd frontend
npm install

<<<<<<< HEAD
cat > .env.local <<EOF
=======
cat > .env.local << EOF
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b
VITE_API_URL=$(cat ../api_url.txt)
VITE_USE_MOCK=0
EOF

npm run dev
```

<<<<<<< HEAD
Open `http://localhost:5173`. Type "light chali gayi, monsoon hai bahar" and tap **Build my cart**.

---

## API contract

`POST /parse-cart`

**Request:**
=======
Open `http://localhost:5173`. Type any situation in any language and tap **Build my cart**.

To see personalization in action: click "Or try a demo profile" → select **Mrs. Iyer** → build a guests cart → notice the ✨ badges and "your usual choice" reasons. The home screen also shows her reorder suggestions (e.g. candles bought ~22 days ago).

---

## API reference

`POST /parse-cart`

**Request body:**
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

```json
{
  "user_text": "light chali gayi, monsoon hai bahar",
  "user_id": "demo_user_1",
  "previous_cart": null,
<<<<<<< HEAD
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
=======
  "action": "generate"
}
```

| Field | Required | Notes |
|---|---|---|
| `user_text` | Yes | Any language, ≤500 chars |
| `user_id` | No | `demo_user_1` or `demo_user_2` for personalized carts |
| `previous_cart` | No | Pass previous response object to refine instead of rebuild |
| `action` | No | `"generate"` (default), `"substitute"`, `"record_order"`, `"record_removal"`, `"get_profile"` |

**Single mode response:**
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

```json
{
  "response_type": "confident",
  "cart_title": "Power Cut Kit",
<<<<<<< HEAD
  "situation_understood": "Power outage during monsoon...",
=======
  "situation_understood": "Power outage during monsoon rain.",
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b
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

<<<<<<< HEAD
**Response — battle mode:** same shape, but `carts` is an array of two cart objects, each tagged `tier: "budget"` or `tier: "premium"`.

---

## Hard rules we built in

A few things were not negotiable in the prompt, and are double-checked in code:

- **No dosages, no diagnoses, ever.** The model is instructed never to suggest these. We don't ship a medical-advice tool, we ship a context-aware shopping one.
- **Quick Health items always carry the OTC safety disclaimer.** Exact string, validated against a constant in the Lambda — if the model writes something different, the post-processor strips it.
- **Delivery note only flags items strictly slower than 20 minutes.** Items at 12–18 min are normal Amazon Now speeds and never get flagged.
- **No prescription medicines.** Scope is OTC only — the things quick-commerce apps in India already deliver today.
=======
**`get_profile` response:** includes the stored profile plus a `reorder_suggestions` array — items predicted to be running low, computed from the user's own order timestamps and per-product replenishment cycles.

---

## What we hard-coded and why

Some things weren't left to the model's discretion:

**No dosages, no diagnoses.** The system prompt instructs the model to never suggest these. The Lambda validates that health carts don't contain anything resembling medical advice before the response goes out.

**Quick Health safety note is non-negotiable.** The exact OTC disclaimer string is a constant in the Lambda. If the model writes something different, the post-processor replaces it. Judges can verify this in `lambda_function.py` — it's one of the first constants defined.

**Delivery flag only fires for items strictly over 20 minutes.** Items at 12–18 min are standard Amazon Now speed and don't get flagged. We ran into a bug where the model was flagging 15-minute items — fixed by moving the check to Python where the math is exact.

**Personalization flags are set by Python, not the model.** The model picks the right products. A separate function then scans every item name against `favorite_brands` from DynamoDB and sets `personalized: true` deterministically. The model doesn't guess at metadata.

**Situation comes from the current message, not order history.** If a user who often orders candles says "shaam ho gayi kuch khane ka man" (evening, hungry), the cart title must be "Evening Snacks" — not "Power Cut Kit." The prompt explicitly tells the model: past orders personalize item selection, never the situation type. This prevents the common mistake where heavy buyers of Category X get misclassified into X situations when they actually need something else.

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
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

---

## Roadmap

<<<<<<< HEAD
**0–3 months.** Expand from 7 to 50+ situation playbooks (festival-specific, regional, seasonal). Personalization from tile-tap history. Tamil, Telugu, Bengali, Marathi rollout.

**3–6 months.** Festival Auto-Mode (cart suggested three days before Diwali). Family Group Carts (mother-in-law approves from her phone). Weather-triggered prompts. Power-grid data integration for proactive outage notifications.

**6–12 months.** Alexa integration — *"Alexa, light chali gayi"* → cart on your phone. Pantry photo → weekly cart. Hyperlocal outage detection.

**Beyond a year.** Cross-category situations like "wedding in family". B2B for kirana shops. Open Situations API for other Amazon services to plug in. Prescription integration through Amazon Pharmacy's existing licensing infrastructure.

The full PRD is in [`docs/PRD-Turant.md`](docs/PRD-Turant.md).
=======
**0–3 months** — Expand from 7 to 50+ situation playbooks. Personalization from tile-tap patterns. Tamil, Telugu, Bengali, Marathi rollout.

**3–6 months** — Festival Auto-Mode (Diwali kit suggestion 3 days before Diwali). Family Group Carts (mom approves from her phone before checkout). Weather-triggered suggestions. Power-grid data integration.

**6–12 months** — Alexa: *"Alexa, light chali gayi"* → cart on your phone. Pantry photo → weekly restock cart. Hyperlocal demand detection.

**1 year+** — Cross-category situations ("wedding in family" → groceries + gifts + travel). B2B version for kirana restocking. Open Situations API for Amazon Fresh, Business, Pharmacy to plug into. Prescription integration through Amazon Pharmacy's existing infrastructure when the regulatory path is clear.
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b

---

## Built by

<<<<<<< HEAD
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
=======
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
>>>>>>> 25ff548815ffd8dfcb9c2bd1f9001d47c4c9a60b
