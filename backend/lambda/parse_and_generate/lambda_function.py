"""
Turant — parse_and_generate Lambda function (v7 FINAL)

Single engine implementing all 4 locked features:

Feature 1 — Adaptive Situation Engine (3-tier response)
   confident / best_guess / clarifying_question modes.

Feature 2 — Explainable + Personalized Reasoning
   Per-item "reason" field; brand preference acknowledgement when user_id
   is supplied (e.g. "Maggi — your usual choice").

Feature 3 — Conversational Refinement
   Pass `previous_cart` to refine an existing cart instead of regenerating.

Feature 4 — Cart Battle (Budget vs Premium)
   Pass `mode: "battle"` + a budget number to receive TWO complete carts
   for occasion-style decisions (e.g. "movie night for 4, budget 500").

Input contract:
{
  "user_text": "...",                  // required
  "user_id": "demo_user_1",            // optional — personalization
  "previous_cart": { ... },            // optional — refinement
  "mode": "single" | "battle",         // optional — default "single"
  "budget_inr": 500                    // optional — only used when mode=battle
}

Output (mode = single, default):
  Standard single-cart JSON (see schema below).

Output (mode = battle):
{
  "response_type": "battle",
  "situation_understood": "...",
  "carts": [
    { ...budget cart with same shape as single response... },
    { ...premium cart with same shape as single response... }
  ]
}
"""

import json
import os
import boto3

dynamodb = boto3.resource("dynamodb")
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

CATALOG_TABLE = os.environ.get("CATALOG_TABLE", "Catalog")
USER_PREFS_TABLE = os.environ.get("USER_PREFS_TABLE", "UserPreferences")
MODEL_ID = "amazon.nova-lite-v1:0"


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------
def get_full_catalog():
    table = dynamodb.Table(CATALOG_TABLE)
    response = table.scan()
    items = response.get("Items", [])
    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))
    return items


def get_user_preferences(user_id):
    if not user_id:
        return None
    table = dynamodb.Table(USER_PREFS_TABLE)
    response = table.get_item(Key={"user_id": user_id})
    return response.get("Item")


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------
def build_catalog_block(catalog):
    lines = []
    for p in catalog:
        tags_str = ", ".join(p.get("tags", []))
        lines.append(
            f'- id: {p["product_id"]}, name: "{p["name"]}", '
            f'price_inr: {p["price_inr"]}, category: {p.get("category", "general")}, '
            f'eta_min: {p.get("eta_min", 15)}, tags: [{tags_str}]'
        )
    return "\n".join(lines)


def build_personalization_block(user_profile):
    if not user_profile:
        return ""
    brands = user_profile.get("favorite_brands", {})
    brand_lines = "\n".join(
        [f"  - {category}: {brand}" for category, brand in brands.items()]
    )
    history = user_profile.get("purchase_history_summary", "")
    household = user_profile.get("household_context", "")
    name = user_profile.get("name", "the user")
    city = user_profile.get("city", "")

    return f"""

PERSONALIZATION CONTEXT — this user has known preferences:
  Name: {name}
  City: {city}
  Favorite brands (when category matches):
{brand_lines}
  Purchase history: {history}
  Household context: {household}

PERSONALIZATION RULES:
- When picking items where the user has a known brand preference for that
  category, prefer products matching those brands when available.
- In the "reason" field for those items, briefly acknowledge it
  (e.g. "Maggi — your usual choice").
- Use household context to tune the cart (e.g. elderly + BP medication →
  prioritize backup power for medical devices).
- Do NOT mention preferences for items with no preference match.
"""


def build_refinement_block(previous_cart):
    if not previous_cart:
        return ""
    return f"""

REFINEMENT CONTEXT — the user already received this cart and is now refining it:
{json.dumps(previous_cart)}

Apply their new instruction to THIS cart (swap, remove, or add items as
requested) rather than starting from scratch. Keep items that are still
relevant.
"""


def build_single_prompt(user_text, catalog, user_profile=None, previous_cart=None):
    """Prompt for default single-cart mode (Features 1, 2, 3)."""
    catalog_block = build_catalog_block(catalog)
    personalization_block = build_personalization_block(user_profile)
    refinement_block = build_refinement_block(previous_cart)

    return f"""You are Turant, an AI shopping assistant for Amazon Now in India.

CUSTOMER MESSAGE:
"{user_text}"
{personalization_block}{refinement_block}

STEP 1 — IDENTIFY THE PRIMARY ACTIONABLE PROBLEM

Read the message carefully. The user may mention multiple things, but ONE
is the actual problem to solve. Others are context.

Examples:
- "light chali gayi, monsoon hai bahar" → PRIMARY: power cut.
  Cart theme = Power Cut Kit.
- "bukhar lag raha hai, kal exam hai" → PRIMARY: fever/cold relief.
  Cart theme = Cold & Cough Kit.

STEP 2 — DECIDE RESPONSE TYPE (MUTUALLY EXCLUSIVE)

MODE A: "confident"
USE WHEN: situation clear AND you can pick 4-6 items with confidence >= 0.7.
OUTPUT: cart_title named after primary problem; clarifying_question MUST be null.

MODE B: "best_guess"
USE WHEN: message implies SOME direction but is partially underspecified.
OUTPUT: tentative cart_title; 2-4 items confidence 0.5-0.7;
situation_understood states your assumption clearly;
clarifying_question MUST be null.

MODE C: "clarifying_question"
USE WHEN: message is too vague ("kuch chahiye", "help karo") OR you cannot
reach 0.6 confidence even with a guess.
OUTPUT: cart_title null; items empty list; ONE short specific clarifying_question.

CONFIDENCE FLOOR: If you cannot honestly assign confidence >= 0.6 to items,
switch to clarifying_question mode.

STEP 3 — ITEM SELECTION GUIDANCE

- Pick from catalog ONLY. Never invent products or prices.
- Power Cut: candles, LED bulb, power bank, instant food (Maggi), cold drinks.
- Health/Fever/Cold: OTC items (Vicks, Strepsils, Crocin, ORS, honey, ginger tea, tissues).
- Guests: paneer, naan, snacks, beverages, dessert, ice.
- Pooja: diyas, camphor, agarbatti, kalawa, coconut, marigold, gangajal.
- Exam Night: coffee, energy bars, sticky notes, highlighters, crackers.

STEP 4 — SAFETY NOTE RULE (STRICT)

Set safety_note to this EXACT string ONLY IF the user explicitly mentions a
health symptom (fever, bukhar, cold, cough, sardi, khaansi, body ache,
stomach upset, headache, baby unwell, sick, ill, dard, throat kharab):

"This is not medical advice. Consult a doctor if symptoms persist beyond
48 hours or worsen. We only suggest OTC products available without a
prescription."

Otherwise set safety_note to null. NEVER suggest dosages. NEVER diagnose.

STEP 5 — DELIVERY NOTE RULE (STRICT MATH)

ONLY set delivery_note if BOTH:
  (a) response_type is "confident" or "best_guess"
  (b) at least ONE item has eta_min STRICTLY GREATER THAN 20 (21+).

If no item exceeds eta_min 20, set delivery_note to null. Items with
eta_min 12, 14, 15, or 18 are normal speeds — do not flag them.

When triggered:
"Most items arrive in ~12 mins, but [item name] takes about [eta_min]
mins — remove it if you need everything faster."

OUTPUT FORMAT — STRICT JSON ONLY, no markdown, no code fences:

{{
  "response_type": "confident" | "best_guess" | "clarifying_question",
  "cart_title": "string or null",
  "situation_understood": "one sentence",
  "clarifying_question": "string or null",
  "items": [
    {{
      "product_id": "string from catalog",
      "name": "string from catalog",
      "reason": "specific reason; if preferred brand matches, acknowledge it",
      "confidence": 0.0,
      "price_inr": 0,
      "eta_min": 0,
      "personalized": false
    }}
  ],
  "safety_note": "string or null",
  "delivery_note": "string or null",
  "personalization_applied": false,
  "total_inr": 0
}}

Set "personalized": true on any item whose selection was influenced by the
user's brand preferences. Set "personalization_applied": true at the cart
level if ANY item is personalized.

CATALOG (37 products available):
{catalog_block}
"""


def build_battle_prompt(user_text, catalog, user_profile=None, budget_inr=None):
    """Prompt for Cart Battle mode (Feature 4)."""
    catalog_block = build_catalog_block(catalog)
    personalization_block = build_personalization_block(user_profile)

    budget_target = budget_inr or 500
    premium_target = int(budget_target * 1.7)

    return f"""You are Turant, an AI shopping assistant for Amazon Now in India.
You are operating in CART BATTLE mode — the user is planning an occasion
and wants TWO complete cart options to choose from.

CUSTOMER MESSAGE:
"{user_text}"

Target budget (Budget cart): around ₹{budget_target}
Target spend (Premium cart): around ₹{premium_target} (about 60-80% higher)
{personalization_block}

YOUR TASK:
Build TWO complete carts that solve the SAME occasion, but at different
quality / spend tiers. Each cart must work on its own; the user will pick one.

BUDGET CART RULES:
- Cheaper variants where possible (basic snacks, smaller pack sizes)
- 4-5 essential items
- Target total around ₹{budget_target}
- Reasons focus on practicality and value

PREMIUM CART RULES:
- Higher-quality / larger variants
- 5-6 items including upgrades (dessert, ice, extras)
- Target total around ₹{premium_target}
- Reasons focus on completeness and a better experience

COMMON RULES:
- Pick from catalog ONLY. Never invent products or prices.
- Each item must have a specific one-line reason.
- Apply personalization (brand preferences) to BOTH carts when relevant.
- Set safety_note based on the same rules as single mode.
- Set delivery_note independently per cart based on eta_min > 20 rule.

OUTPUT FORMAT — STRICT JSON ONLY, no markdown, no code fences:

{{
  "response_type": "battle",
  "situation_understood": "one sentence describing the occasion",
  "carts": [
    {{
      "tier": "budget",
      "cart_title": "Budget Cart — [occasion]",
      "items": [
        {{
          "product_id": "string from catalog",
          "name": "string from catalog",
          "reason": "string",
          "confidence": 0.0,
          "price_inr": 0,
          "eta_min": 0,
          "personalized": false
        }}
      ],
      "safety_note": "string or null",
      "delivery_note": "string or null",
      "personalization_applied": false,
      "total_inr": 0
    }},
    {{
      "tier": "premium",
      "cart_title": "Premium Cart — [occasion]",
      "items": [ ...same shape... ],
      "safety_note": "string or null",
      "delivery_note": "string or null",
      "personalization_applied": false,
      "total_inr": 0
    }}
  ]
}}

CATALOG (37 products available):
{catalog_block}
"""


# ---------------------------------------------------------------------------
# Bedrock call + parsing
# ---------------------------------------------------------------------------
def call_bedrock(prompt_text, max_tokens=1800):
    response = bedrock.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": [{"text": prompt_text}]}],
        inferenceConfig={"maxTokens": max_tokens, "temperature": 0.3},
    )
    return response["output"]["message"]["content"][0]["text"]


def parse_model_output(raw_text):
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()
    return json.loads(cleaned)


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------
def lambda_handler(event, context):
    try:
        body = event.get("body")
        if isinstance(body, str):
            body = json.loads(body) if body else {}
        elif body is None:
            body = event

        user_text = body.get("user_text", "").strip()
        user_id = body.get("user_id")
        previous_cart = body.get("previous_cart")
        mode = body.get("mode", "single")
        budget_inr = body.get("budget_inr")

        if not user_text:
            return _response(400, {"error": "user_text is required"})

        if len(user_text) > 500:
            return _response(400, {"error": "user_text must be under 500 characters"})

        catalog = get_full_catalog()
        if not catalog:
            return _response(500, {"error": "Catalog is empty"})

        user_profile = get_user_preferences(user_id) if user_id else None

        if mode == "battle":
            prompt = build_battle_prompt(user_text, catalog, user_profile, budget_inr)
            raw_output = call_bedrock(prompt, max_tokens=2500)
        else:
            prompt = build_single_prompt(user_text, catalog, user_profile, previous_cart)
            raw_output = call_bedrock(prompt, max_tokens=1800)

        result = parse_model_output(raw_output)
        return _response(200, result)

    except json.JSONDecodeError as e:
        return _response(500, {"error": "Model returned invalid JSON", "details": str(e)})
    except Exception as e:
        return _response(500, {"error": str(e)})


def _response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
        },
        "body": json.dumps(body_dict),
    }
