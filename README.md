# Turant ⚡

> **You describe the situation. One confident cart shows up in seconds. That's it.**

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
             Eveready Candles (pack of 10)        ₹45    90%
             Tonight's light, no electricity needed.

             ⚠ Eveready Candles abhi out of stock hai —
               Philips LED Night Light rakh diya, similar. Theek hai?
               [ Haan, rakho ]   [ Nahi, hata do ]

             Wipro Emergency Rechargeable LED Bulb ₹399   88%
             Lasts 6 hrs on a single charge.

             Mi Power Bank 10000mAh               ₹899   85%
             Keeps your phone (and BP monitor) powered.

             TOTAL  ₹1,343  ·  delivery in ~14 min
             [ Order now ]    [ 🟢 Share ]
```

No search. No 47 results. No brand comparison. Just a cart with reasons.

---

## Core features

### 1. Adaptive Situation Engine (binary)

The AI decides how confident to be *before* it responds. It's binary — no wishy-washy middle:

| What the user says | Mode | What happens |
|---|---|---|
| "light chali gayi, monsoon hai bahar" | **Confident** | Full cart, 3–6 items, each with a reason |
| "kuch chahiye" | **Clarifying question** | No cart — one short question back |

The confidence floor is hard-coded at 0.6. If the model can't honestly pick at least 3 relevant items above that threshold, it asks one question instead of guessing wrong. "I know exactly what you need" or "let me ask one thing first" — nothing in between.

### 2. Explainable + Personalized reasoning

Every item carries a one-line reason in plain language. When the user has order history, those preferences surface — *"You order this often"* or *"Coca-Cola — your usual choice"* — with a ✨ badge.

**The model picks products; Python owns the personalization.** A deterministic layer in the Lambda (`apply_personalization_flags`) sets the `personalized` flags by matching item names against the user's `favorite_brands` and their actual order history. It also **strips any personalization wording the model writes and re-adds the correct phrase** — so the model can never put "Maggi — your usual choice" on a Coca-Cola, and phrases never duplicate. The model is creative; the code is reliable.

**Critical rule — situation vs personalization.** Past orders personalize *item selection*, never the *situation*. If a user who often buys candles says "shaam ho gayi kuch khane ka man" (evening, hungry), the title is "Evening Snacks" — not "Power Cut Kit." The situation comes from the current message; history only refines which brand/variant gets picked. (See `SITUATION_VS_PERSONALIZATION.md`.)

### 3. Conversational refinement

After the cart appears, the user can talk back to it:

> *"Maggi hata do, kuch healthy do"*

The previous cart goes back in the request as `previous_cart` context. The model swaps items rather than starting over, and the title updates too.

### 4. Smart Substitution (driven by real stock)

This is **not** simulated. The catalog has a real `in_stock` field. When a cart contains an item that's genuinely out of stock, Turant offers the closest **in-stock** alternative inline:

> *"Eveready Candles abhi out of stock hai — Philips LED Night Light rakh diya, similar choice. Theek hai?"*

The matching logic (`findSubstituteScored`) is deliberately strict so swaps are sensible, not random:
- **Food/non-food hard gate** — a Rakhi Set can never replace an out-of-stock sweet just because both are tagged "festival."
- **Specific-tag match only** — generic tags like "beverage" or "snack" don't justify a swap; the alternative must share a *specific* tag (light→light, dessert→dessert, throat→throat). If there's no genuinely close match, no swap is offered.

The proposal is frozen per cart generation (React `key={cartGen}`) so the confirmation banner can never contradict the cart.

### 5. Confidence Feedback Loop (hard-enforced learning)

Every cart item has a × button. Removing an item calls `record_removal`, which stores it as a negative signal (with the situation context) in DynamoDB.

The next time that user builds a cart, the removed item is **deterministically stripped** in Python (`strip_disliked_items`) — the prompt asks the model to avoid it, but the code *guarantees* it. The only way it comes back is if the user explicitly names it by a distinctive/brand word ("haldiram"), not a generic category word ("namkeen"). Remove Haldiram once, and it stays gone.

### 6. Proactive — Time-of-day routine anticipation

The home screen reads the real device clock and anticipates the household rhythm — morning pooja + breakfast, evening chai + snacks, late-night next-day essentials. One tap runs the suggestion through the same Adaptive Situation Engine, so the cart is real, not canned. No fake telemetry.

### 7. Proactive — Reorder / replenishment prediction

Every order is timestamped per item (`item_last_ordered`). Each consumable has a typical replenishment cycle (`PRODUCT_REPLENISH_DAYS` / `CATEGORY_REPLENISH_DAYS`). `compute_reorder_suggestions` predicts what's likely running low from the user's **own** data:

> *"You bought Eveready Candles about 22 days ago — it's likely run out by now. Reorder?"*

Durable goods (power banks, bulbs, batteries) are deliberately excluded so the user is never nagged to reorder a one-off purchase. Tapping reorder builds a cart directly from the prediction — no LLM guess involved.

### 8. WhatsApp share

After a cart is generated, one tap opens WhatsApp with a pre-formatted summary — items, prices, total, ETA — so the household decision-maker can approve before anything is ordered.

---

## Trust & safety: what the code guarantees (not the model)

This is the heart of the "Code > Model" design. After the model returns JSON, a chain of **deterministic Python guards** runs before anything reaches the user:

| Guard | What it enforces |
|---|---|
| `enrich_items_from_catalog` | Overwrites every item's name/price/eta from the real catalog by `product_id`, and **drops any product the model invents**. Prices and products can't be hallucinated — the catalog is the single source of truth. |
| `strip_medical_when_no_symptom` | OTC/medical items (Crocin, Vicks, Dolo, ORS…) only appear if the current message mentions a health symptom — even if they're a favorite. |
| `strip_disliked_items` | Items the user previously removed are dropped unless explicitly re-requested by name. |
| `apply_personalization_flags` | Sets `personalized` flags and writes the correct personalization phrase; strips any wrong/duplicated wording the model produced. |
| `fix_safety_note` | The safety note is either the exact OTC disclaimer string or `null` — model can't invent its own. |
| `fix_delivery_note` | Delivery warning fires only when an item's `eta_min` is strictly > 20. |

No product photos are fetched from third parties — each item shows a clean category-icon tile, so there's nothing fake or flaky in the UI.

---

## Architecture

```
┌─────────────────┐   HTTPS    ┌──────────────────┐   invoke   ┌─────────────────┐
│                 │  ────────▶ │                  │ ─────────▶ │                 │
│  React + Vite   │            │   API Gateway    │            │  Lambda         │
│  (Frontend)     │            │   (REST proxy)   │            │  Python 3.12    │
│                 │  ◀──────── │                  │ ◀───────── │                 │
└─────────────────┘   JSON     └──────────────────┘            └────────┬────────┘
                                                                        │
                                              ┌─────────────────────────┼──────┐
                                              ▼                         ▼      ▼
                                     ┌─────────────────┐     ┌──────────────────┐
                                     │  DynamoDB        │     │  Amazon Bedrock  │
                                     │  ─ Catalog (63)  │     │  Nova Lite       │
                                     │  ─ UserPrefs     │     │  (Converse API)  │
                                     │  ─ SituationPlay │     └──────────────────┘
                                     │  ─ CartSessions  │
                                     └─────────────────┘
```

One Lambda — `parse_and_generate` — handles everything. The request body's `action` field routes the behavior:

| `action` | Purpose |
|---|---|
| `generate` (default) | Build a cart from `user_text` (+ optional `user_id`, `previous_cart`) |
| `substitute` | Best in-stock swap for an out-of-stock `product_id` |
| `record_order` | Append an order to learned history (timestamps included) |
| `record_removal` | Store a removed item as a negative signal |
| `get_profile` | Return the profile + computed `reorder_suggestions` |

The model's JSON output always passes through the deterministic guard chain above before it reaches the frontend.

### Why no EC2

Quick-commerce traffic is bursty — a power cut hits one neighborhood and 500 carts get generated in two minutes, then nothing for an hour. Lambda absorbs both spikes and idle automatically and costs nothing when idle. DynamoDB on-demand scales the same way with zero provisioning.

---

## Tech stack

| Layer | What | Why |
|---|---|---|
| Frontend | React 18 + Vite 5, vanilla CSS | No framework overhead, fast iteration |
| API | API Gateway (REST, Lambda proxy) | 1M calls/month free |
| Compute | AWS Lambda (Python 3.12) | Pay nothing idle, auto-scale on demand |
| AI model | Amazon Nova Lite via Bedrock (`amazon.nova-lite-v1:0`) | 2–3s latency, cheapest frontier model |
| Database | DynamoDB on-demand | 25GB free, zero provisioning |
| Dev tool | Kiro IDE | Hackathon mandate |

The frontend ships with a complete mock backend (`src/mock.js`). If the API is unreachable, the mock auto-takes over and every response is tagged `_source: "live" | "mock" | "mock-fallback"`, so the demo never hard-fails.

---

## Repo structure

```
turant/
├── backend/
│   ├── data/
│   │   ├── catalog.json              63 products — brand-accurate, with in_stock flags
│   │   ├── situation_playbooks.json  5 reference playbooks (legacy)
│   │   └── user_preferences.json     2 demo profiles (Mrs. Iyer + Aarav)
│   ├── scripts/
│   │   ├── setup_dynamodb.py         creates the 4 DynamoDB tables
│   │   └── seed_data.py              loads catalog + playbooks + user preferences
│   └── lambda/parse_and_generate/
│       ├── lambda_function.py        all features + deterministic guards in one engine
│       └── requirements.txt          just boto3
├── frontend/
│   └── src/
│       ├── App.jsx                   main app + flow orchestration
│       ├── api.js                    API client + mock fallback
│       ├── mock.js                   offline safety net (mirrors the Lambda)
│       ├── catalog.js                client catalog + substitution logic (in_stock aware)
│       └── components/
│           ├── Cart.jsx                 cart display + Share + × removal
│           ├── ProductThumb.jsx         clean category-icon thumbnail (no external images)
│           ├── SmartSubstitution.jsx    in-stock-driven out-of-stock swap
│           ├── RefineBar.jsx            conversational refinement input
│           ├── ClarifyingQuestion.jsx   the "ask one thing" path
│           ├── RoutineSuggestion.jsx    time-of-day proactive suggestion
│           ├── ReorderSuggestion.jsx    replenishment-prediction reorder card
│           ├── Identity.jsx             sign-in + demo persona quick-switch
│           ├── LearnedStrip.jsx         shows what Turant has learned
│           └── … Header, HeroInput, SampleChips, Loading, OrderConfirmation, ErrorBanner
├── SITUATION_VS_PERSONALIZATION.md   the critical design rule, documented
└── README.md
```

---

## Running it locally

### Prerequisites
- AWS account with Bedrock access enabled for `amazon.nova-lite-v1:0` in `us-east-1`
- AWS CLI v2 configured (`aws configure`)
- Node 18+ and Python 3.12+

### 1 — DynamoDB tables + seed data
```bash
python3 -m venv venv && source venv/bin/activate
pip install boto3
cd backend/scripts
python3 setup_dynamodb.py
python3 seed_data.py
```
You'll get four tables: `Catalog` (63 products), `UserPreferences` (2 profiles), `SituationPlaybooks`, `CartSessions`.

### 2 — Deploy the Lambda
Create a Lambda named `parse_and_generate` (Python 3.12) in `us-east-1`. Give its execution role DynamoDB + Bedrock access. Then:
```bash
cd ../lambda/parse_and_generate
zip lambda_deploy.zip lambda_function.py
aws lambda update-function-code --function-name parse_and_generate \
  --zip-file fileb://lambda_deploy.zip --region us-east-1
aws lambda update-function-configuration --function-name parse_and_generate \
  --timeout 30 --memory-size 256 --region us-east-1
```

### 3 — API Gateway
```bash
cd ../../.. && bash setup_api_gateway.sh   # prints the invoke URL, writes api_url.txt
```

### 4 — Test the API
```bash
# Basic situation
curl -X POST "$(cat api_url.txt)" -H "Content-Type: application/json" \
  -d '{"user_text": "light chali gayi, monsoon hai bahar"}'

# Personalized
curl -X POST "$(cat api_url.txt)" -H "Content-Type: application/json" \
  -d '{"user_text": "mehmaan aa rahe hain", "user_id": "demo_user_1"}'

# Profile + reorder suggestions
curl -X POST "$(cat api_url.txt)" -H "Content-Type: application/json" \
  -d '{"action": "get_profile", "user_id": "demo_user_1"}'
```

### 5 — Frontend
```bash
cd frontend && npm install
cat > .env.local << EOF
VITE_API_URL=$(cat ../api_url.txt)
VITE_USE_MOCK=0
EOF
npm run dev   # http://localhost:5173
```
To see personalization + reorder: open the home screen → "try a demo profile" → **Mrs. Iyer** → build a guests cart.

---

## API reference

`POST /parse-cart`

```json
{
  "user_text": "light chali gayi, monsoon hai bahar",
  "user_id": "demo_user_1",
  "previous_cart": null,
  "action": "generate"
}
```

| Field | Required | Notes |
|---|---|---|
| `user_text` | for `generate` | Any language, ≤500 chars |
| `user_id` | No | `demo_user_1` / `demo_user_2` for personalized carts |
| `previous_cart` | No | Pass the previous response to refine instead of rebuild |
| `action` | No | `generate` (default), `substitute`, `record_order`, `record_removal`, `get_profile` |

**Confident response (abridged):**
```json
{
  "response_type": "confident",
  "cart_title": "Power Cut Kit",
  "situation_understood": "Power outage during monsoon rain.",
  "clarifying_question": null,
  "items": [
    {
      "product_id": "P002",
      "name": "Wipro Emergency Rechargeable LED Bulb",
      "reason": "Lasts 6 hrs on a single charge.",
      "confidence": 0.9, "price_inr": 399, "eta_min": 12,
      "in_stock": true, "personalized": false
    }
  ],
  "safety_note": null, "delivery_note": null,
  "personalization_applied": false, "total_inr": 1343
}
```

`get_profile` additionally returns a `reorder_suggestions` array computed from the user's own order timestamps.

---

## Demo users

Two profiles are seeded with backdated order history so personalization and reorder prediction visibly fire:

- **demo_user_1 — Mrs. Iyer** (Chennai, senior, husband on BP medication). History: Amul milk, Eveready candles, Britannia biscuits, Crocin. Power Cut and guests carts surface her favorites with ✨ badges; the home screen shows reorder suggestions (e.g. candles bought ~22 days ago).
- **demo_user_2 — Aarav** (Delhi, hostel student). History: Maggi, Nescafé, Yoga Bar energy bars.

Anonymous mode works too — it just skips personalization.

---

## What changed (recent iteration log)

This codebase went through several rounds of hardening. The notable changes:

- **Removed `best_guess` mode** → clean binary design (confident / clarifying_question only).
- **Removed Cart Battle and Neighborhood Pulse** from the UI — Battle added decision friction (against the thesis) and Pulse used fake telemetry. Battle remains as inert backend code; Pulse is gone.
- **Smart Substitution is now real**, driven by a catalog `in_stock` field instead of a simulated out-of-stock on every cart. Added a food/non-food gate and specific-tag matching so swaps are sensible (no "cola → ice cubes" or "Rakhi → sweet").
- **Confidence Feedback Loop is now deterministically enforced** (`strip_disliked_items`) — removed items can't silently return; they only come back on explicit brand-name request.
- **Personalization reasons are deterministic** — the model's wording is stripped and the correct phrase re-added, killing the "Maggi — your usual choice on a Coca-Cola" bug and duplicate phrases.
- **Anti-hallucination enrichment** (`enrich_items_from_catalog`) — names/prices/ETAs are taken from the real catalog and invented products are dropped.
- **Situation-vs-personalization rule** added to the prompt and enforced by intent: history personalizes items, never the situation type.
- **External product images removed.** Stock-photo services returned inaccurate/broken images, so each item now shows a clean category-icon tile — nothing fake, nothing flaky.
- **Catalog expanded to 63 brand-accurate products** (Eveready, Wipro, Maggi, Amul, Haldiram's, Crocin, etc.), kept in sync between `backend/data/catalog.json` and `frontend/src/catalog.js`.

---

## What we didn't build (and why)

- **Photo / voice input.** The architecture supports vision and Transcribe/Polly, but a shaky live demo is worse than no demo. Roadmap, not demo.
- **Prescription medicines.** OTC only — prescription handling needs Amazon Pharmacy's licensing, not a quick-commerce assistant.
- **Real payments / delivery.** Out of scope; the confirmation screen says so explicitly.

---

## The one question we kept asking

> *"Does this make Mrs. Iyer's 9pm power-cut moment easier?"*

If yes → build it. If no → drop it, however clever it seemed. That's what "start with the customer" means in practice.
