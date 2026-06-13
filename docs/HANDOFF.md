# Turant — Deployment & Testing Handoff Guide

> **Read this first if context is lost or you're picking up work after a break.**
> This guide contains the complete state of the project, what's done, what's next, and how to deploy + test everything.

---

## Project state (snapshot)

**Project name:** Turant
**Hackathon:** HackOn with Amazon 6.0 — Problem Statement 2 (Amazon Now — Reimagining Urgent Shopping)
**Repo:** github.com/Iam-raunac/turant
**Team:** Solo coder (Raunak) + partner doing PPT/video/submission

### What is built and working

- ✅ AWS account configured (us-east-1, $200 free tier credits available)
- ✅ AWS CLI configured locally (`aws configure` done)
- ✅ Bedrock model access: Claude Sonnet 4.5 (vision, future use) + Nova Lite (active workhorse)
- ✅ DynamoDB tables created: `Catalog`, `SituationPlaybooks`, `CartSessions`
- ✅ 37 products seeded in Catalog (with `eta_min` field)
- ✅ Lambda function `generate_cart` (v1, tile-based — legacy, do not touch)
- ✅ Lambda function `parse_and_generate` (v5, natural-language input — TESTED, working)
- ✅ Backend pushed to GitHub once

### What is in this handoff to deploy next

1. **`UserPreferences` table** + seeding (Feature 2 personalization)
2. **Lambda v7** (FINAL) — combines all 4 features into one engine
3. Testing checklist for all features
4. Then: API Gateway → frontend

---

## The 4 locked features (single source of truth)

| # | Feature | Status | Code in |
|---|---------|--------|---------|
| 1 | Adaptive Situation Engine (3-tier: confident / best_guess / clarifying_question) | Code ready (v7) | `lambda_function.py` |
| 2 | Explainable + Personalized Reasoning | Code ready (v7) | `lambda_function.py` + `user_preferences.json` |
| 3 | Conversational Refinement (`previous_cart` param) | Code ready (v7) | `lambda_function.py` |
| 4 | Cart Battle — Budget vs Premium (`mode: "battle"`) | Code ready (v7) | `lambda_function.py` |

---

## Step-by-step deployment

### Step A: Update local files in Kiro

Place these files in your local `~/Desktop/turant/` repo:

```
backend/
├── data/
│   ├── catalog.json                          (already exists — keep as is)
│   └── user_preferences.json                 (NEW — copy from this package)
├── scripts/
│   ├── setup_dynamodb.py                     (REPLACE with v7 version)
│   └── seed_data.py                          (REPLACE with v7 version)
└── lambda/
    └── parse_and_generate/
        ├── lambda_function.py                (REPLACE with v7 — final version)
        └── requirements.txt                  (keep as is, just `boto3>=1.34.0`)
```

### Step B: Create + seed the UserPreferences table

In Kiro terminal:

```bash
cd ~/Desktop/turant
source venv/bin/activate
cd backend/scripts
python3 setup_dynamodb.py
python3 seed_data.py
```

Expected output for setup:
```
Table 'Catalog' already exists. Skipping.
Table 'SituationPlaybooks' already exists. Skipping.
Table 'CartSessions' already exists. Skipping.
Creating table 'UserPreferences'... (this takes ~10-20 seconds)
Table 'UserPreferences' is ready.
```

Expected output for seed:
```
Seeded 37 products into Catalog table.
Seeded ... situation playbooks into SituationPlaybooks table.   (or "Skipping" if missing)
Seeded 2 user profiles into UserPreferences table.
```

### Step C: Deploy v7 Lambda to AWS Console

1. AWS Console → Lambda → `parse_and_generate`
2. Code tab → **Cmd+A → Delete all existing code**
3. Open local `backend/lambda/parse_and_generate/lambda_function.py`, copy entire content
4. Paste into AWS Code editor
5. Click **Deploy** (orange button, top-right)

### Step D: Confirm timeout is still 30 sec

Configuration → General configuration → Timeout = 30 sec. Save if not.

---

## Testing checklist — run these 8 tests in order

For each test: open Lambda → Test tab → edit the existing test event JSON → Save → Test.

### Test 1 — Feature 1: Confident mode (anonymous)

Input:
```json
{"user_text": "light chali gayi, monsoon hai bahar, ghar pe kuch nahi hai"}
```

Expected:
- `response_type: "confident"`
- `cart_title: "Power Cut Kit"` (not "Monsoon Kit")
- 4-6 items: Candles, LED Bulb, Power Bank, Maggi, Cold Drinks
- `safety_note: null`
- `personalization_applied: false`

### Test 2 — Feature 1: Best Guess mode

Input:
```json
{"user_text": "kal kuch plan hai, suggest karo"}
```

Expected:
- `response_type: "best_guess"`
- `cart_title` is tentative (some name)
- 2-4 items with confidence 0.5-0.7
- `situation_understood` clearly states an assumption ("Assuming you...")
- `clarifying_question: null`

### Test 3 — Feature 1: Clarifying Question mode

Input:
```json
{"user_text": "kuch chahiye"}
```

Expected:
- `response_type: "clarifying_question"`
- `cart_title: null`
- `items: []`
- `clarifying_question` is one short sensible question

### Test 4 — Feature 1: Health (safety note)

Input:
```json
{"user_text": "bukhar lag raha hai, throat bhi kharab hai"}
```

Expected:
- `response_type: "confident"`
- `cart_title: "Cold & Cough Kit"`
- OTC items: Crocin, Strepsils, Vicks, Honey, Ginger Tea, Tissue
- `safety_note` is the standard medical disclaimer

### Test 5 — Feature 2: Personalization

Input:
```json
{
  "user_text": "light chali gayi, monsoon hai bahar",
  "user_id": "demo_user_1"
}
```

Expected:
- Same Power Cut cart as Test 1
- `personalization_applied: true`
- For Maggi (or any preferred brand): `personalized: true` and reason mentions "your usual choice" / "you typically buy" / similar acknowledgement
- Cart should also tune for elderly + BP context (e.g. prefer power bank for BP monitor)

### Test 6 — Feature 3: Refinement

First run Test 1 (anonymous Power Cut) and **save the JSON body** somewhere. Then:

Input (paste the actual cart from Test 1 inside `previous_cart`):
```json
{
  "user_text": "Maggi hata do, kuch healthy do",
  "previous_cart": {
    "response_type": "confident",
    "cart_title": "Power Cut Kit",
    "items": [
      {"product_id": "P001", "name": "Candles (pack of 10)", "reason": "...", "confidence": 0.9, "price_inr": 40, "eta_min": 12},
      {"product_id": "P002", "name": "Rechargeable LED Bulb", "reason": "...", "confidence": 0.85, "price_inr": 299, "eta_min": 12},
      {"product_id": "P004", "name": "Maggi Atta Noodles (pack of 4)", "reason": "...", "confidence": 0.8, "price_inr": 140, "eta_min": 12},
      {"product_id": "P005", "name": "Cold Drinks Pack (6 cans)", "reason": "...", "confidence": 0.75, "price_inr": 240, "eta_min": 12},
      {"product_id": "P003", "name": "Power Bank 10000mAh", "reason": "...", "confidence": 0.8, "price_inr": 699, "eta_min": 14}
    ],
    "total_inr": 1418
  }
}
```

Expected:
- Same cart structure
- Maggi is REMOVED
- A healthier alternative added (energy bar / honey / ginger tea / similar)
- Other items mostly unchanged

### Test 7 — Feature 4: Cart Battle (anonymous)

Input:
```json
{
  "user_text": "movie night for 4 people",
  "mode": "battle",
  "budget_inr": 500
}
```

Expected:
- `response_type: "battle"`
- `carts` is an array of EXACTLY 2 carts
- Cart 0: `tier: "budget"`, total around ₹500, 4-5 items
- Cart 1: `tier: "premium"`, total around ₹800-900, 5-6 items including upgrades (dessert, ice)
- Both carts have items + reasons + confidence + safety/delivery notes

### Test 8 — Feature 4: Cart Battle (personalized)

Input:
```json
{
  "user_text": "movie night for 4 people",
  "mode": "battle",
  "budget_inr": 500,
  "user_id": "demo_user_2"
}
```

Expected:
- Same battle structure
- At least one item per cart should reflect Aarav's preferences (e.g. Maggi, Parle-G, Coca-Cola)
- `personalization_applied: true` on both carts

---

## If a test fails — debugging guide

### Symptom: `Status: Failed` with "Model returned invalid JSON"

Cause: Nova Lite returned text with markdown code fences or extra text.
Fix: Already handled by `parse_model_output` — but if it persists, the prompt may have led model into prose. Re-run; if consistent, lower temperature to 0.2 in `call_bedrock`.

### Symptom: `delivery_note` flags items with eta_min 12-18

Cause: Model not respecting "strictly > 20" rule.
Severity: Low. Cosmetic only. Don't fix unless trivial.

### Symptom: `personalization_applied: false` even with user_id

Cause: UserPreferences table empty or wrong key.
Fix: Re-run `python3 seed_data.py` and verify the table has `demo_user_1` and `demo_user_2`.

### Symptom: Lambda timeout (15s+)

Cause: Bedrock cold start or rate limit.
Fix: Re-run the test once. If still slow, check Configuration → Memory and bump to 256 MB.

---

## What comes after these 8 tests pass

1. **GitHub push** — commit all updated files:
   ```bash
   cd ~/Desktop/turant
   git add .
   git commit -m "Feature 2/3/4: personalization, refinement, cart battle in v7 lambda"
   git push
   ```

2. **API Gateway setup** — REST API → `/parse-cart` endpoint → POST → integrate with `parse_and_generate` Lambda → enable CORS → deploy to `prod` stage → get the invoke URL.

3. **Frontend** — React + Vite app with mobile-styled UI:
   - Input box: "What do you need?"
   - 3 response states (confident / best_guess / clarifying_question)
   - Refinement input (after a cart is shown)
   - Cart Battle 2-up layout (when battle mode)
   - User profile switcher (anonymous / demo_user_1 / demo_user_2)
   - Sample input chips for demo (5 pre-filled scenarios)

4. **Demo video script** — 3 minutes, 5 scenarios, end with future vision

5. **PPT** — 8 slides

6. **Submission**

---

## Key files in this handoff package

```
backend/
├── data/
│   ├── catalog.json                 — 37 products with eta_min
│   └── user_preferences.json        — 2 demo users (Mrs. Iyer, Aarav)
├── scripts/
│   ├── setup_dynamodb.py            — creates 4 tables incl. UserPreferences
│   └── seed_data.py                 — seeds catalog + playbooks + users
└── lambda/
    └── parse_and_generate/
        ├── lambda_function.py       — v7 FINAL with all 4 features
        └── requirements.txt
docs/
└── HANDOFF.md                       — this file
```

---

## Important context for resuming

- The team has $200 AWS free tier credits — never worry about cost.
- All resources are in **us-east-1**.
- Bedrock models in use: `amazon.nova-lite-v1:0` (main) and `claude-sonnet-4-5` (vision, unused so far).
- Lambda role `generate_cart-role-xxxxxxxx` has DynamoDB + Bedrock full access (re-use for any new Lambda).
- AI detection: PRD already written in human voice (`PRD-Jhatpat.md`) — but the project name is now **Turant**, not Jhatpat. Search-replace `Jhatpat` → `Turant` if reusing the PRD.
- Hackathon ends with submission. Demo video must be pre-recorded as fallback in case live demo URL flakes.
