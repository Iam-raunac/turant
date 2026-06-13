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
import time
from decimal import Decimal

import boto3

dynamodb = boto3.resource("dynamodb")
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

CATALOG_TABLE = os.environ.get("CATALOG_TABLE", "Catalog")
USER_PREFS_TABLE = os.environ.get("USER_PREFS_TABLE", "UserPreferences")
MODEL_ID = "amazon.nova-lite-v1:0"

STANDARD_SAFETY_NOTE = (
    "This is not medical advice. Consult a doctor if symptoms persist beyond "
    "48 hours or worsen. We only suggest OTC products available without a "
    "prescription."
)


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


def record_order(user_id, items, name=None):
    """Append an order to the user's learned history.

    Auto-creates the profile on first order. Keeps a running tally of how many
    times each product and category has been bought so future carts can boost
    the user's actual favorites — no hardcoded preferences needed.
    """
    table = dynamodb.Table(USER_PREFS_TABLE)
    existing = table.get_item(Key={"user_id": user_id}).get("Item") or {}

    item_counts = existing.get("item_counts") or {}
    item_names = existing.get("item_names") or {}
    category_counts = existing.get("category_counts") or {}

    # category lookup from catalog
    catalog_by_id = {p["product_id"]: p for p in get_full_catalog()}

    for it in items:
        pid = it.get("product_id") or it.get("name")
        if not pid:
            continue
        item_counts[pid] = int(item_counts.get(pid, 0)) + 1
        item_names[pid] = it.get("name", pid)
        category = (catalog_by_id.get(pid) or {}).get("category", "general")
        category_counts[category] = int(category_counts.get(category, 0)) + 1

    profile = {
        "user_id": user_id,
        "name": name or existing.get("name") or user_id,
        "order_count": int(existing.get("order_count", 0)) + 1,
        "last_order_ts": int(time.time()),
        "item_counts": item_counts,
        "item_names": item_names,
        "category_counts": category_counts,
    }
    # preserve any seeded demographic fields
    for key in (
        "favorite_brands",
        "purchase_history_summary",
        "household_context",
        "city",
        "language",
    ):
        if key in existing:
            profile[key] = existing[key]

    table.put_item(Item=profile)
    return profile


def record_removal(user_id, items, context=None):
    """Feature: Confidence Feedback Loop.

    When a user removes an item from a generated cart, store it as a NEGATIVE
    signal so future carts avoid it. Keeps a running tally per product plus the
    situation context in which it was removed (e.g. "Dinner for Guests"), so
    the system can learn things like "this user doesn't serve sweets to guests".
    Auto-creates the profile if the user has never ordered.
    """
    table = dynamodb.Table(USER_PREFS_TABLE)
    existing = table.get_item(Key={"user_id": user_id}).get("Item") or {}

    disliked = existing.get("disliked_items") or {}
    removed_categories = existing.get("removed_category_counts") or {}

    catalog_by_id = {p["product_id"]: p for p in get_full_catalog()}

    for it in items:
        pid = it.get("product_id") or it.get("name")
        if not pid:
            continue
        entry = disliked.get(pid) or {"name": it.get("name", pid), "count": 0}
        entry["count"] = int(entry.get("count", 0)) + 1
        entry["name"] = it.get("name", entry.get("name", pid))
        if context:
            entry["last_context"] = context
        disliked[pid] = entry

        category = (catalog_by_id.get(pid) or {}).get("category", "general")
        removed_categories[category] = int(removed_categories.get(category, 0)) + 1

    existing["user_id"] = user_id
    existing["disliked_items"] = disliked
    existing["removed_category_counts"] = removed_categories
    table.put_item(Item=existing)
    return existing


def find_substitute(product_id, catalog, exclude_ids=None):
    """Feature: Smart Substitution.

    Given an out-of-stock product, find the best in-catalog alternative:
    ranked by tag overlap (semantic similarity) first, then same-category,
    then closest price. Falls back to same category if nothing shares a tag.
    Returns the full catalog product dict (or None if no sensible swap exists).
    """
    exclude = set(exclude_ids or [])
    exclude.add(product_id)

    target = next((p for p in catalog if p["product_id"] == product_id), None)
    if not target:
        return None

    target_tags = set(target.get("tags", []))
    target_category = target.get("category")
    target_price = float(target.get("price_inr", 0))

    pool = [p for p in catalog if p["product_id"] not in exclude]

    def overlap_of(p):
        return len(target_tags & set(p.get("tags", [])))

    candidates = [p for p in pool if overlap_of(p) > 0]
    if not candidates:
        candidates = [p for p in pool if p.get("category") == target_category]
    if not candidates:
        return None

    def score(p):
        same_cat = 0 if p.get("category") == target_category else 1
        price_diff = abs(float(p.get("price_inr", 0)) - target_price)
        return (-overlap_of(p), same_cat, price_diff)

    candidates.sort(key=score)
    return candidates[0]


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


def build_learned_history_block(user_profile):
    """Turn the user's actual order tally into a prompt section."""
    counts = user_profile.get("item_counts") or {}
    names = user_profile.get("item_names") or {}
    cats = user_profile.get("category_counts") or {}
    if not counts:
        return ""

    top_items = sorted(counts.items(), key=lambda kv: int(kv[1]), reverse=True)[:8]
    item_lines = "\n".join(
        f"  - {names.get(pid, pid)} (ordered {int(c)} time(s))" for pid, c in top_items
    )
    top_cats = sorted(cats.items(), key=lambda kv: int(kv[1]), reverse=True)[:5]
    cat_line = ", ".join(f"{c} ({int(n)}x)" for c, n in top_cats)

    return f"""

LEARNED ORDER HISTORY (this user's past orders — use ONLY as a tie-breaker):
{item_lines}
Most-ordered categories: {cat_line}

LEARNED-HISTORY RULES (READ CAREFULLY — relevance is an ABSOLUTE gate):
1. SITUATION RELEVANCE COMES FIRST, ALWAYS. Build the cart from items that
   genuinely solve the CURRENT situation. The learned list NEVER changes WHICH
   kind of cart you build.
2. A learned item may ONLY appear in the cart if it would already belong there
   on its own merits for THIS situation. If the item does not fit the
   situation's theme, DO NOT include it — no matter how many times it was bought.
   - Power cut → do NOT add food/snacks/sweets just because they are favorites.
   - Festival / Rakhi / Pooja → do NOT add naan, paneer, cola, namkeen, noodles.
   - Health / fever → do NOT add any food, drinks, or non-medical items.
   - Stationery / exam → do NOT add curries or sweets.
3. Use learned history ONLY to choose BETWEEN two items that both already fit
   the situation (e.g. prefer the user's usual cola brand among drinks), or to
   add ONE clearly-relevant favorite.
4. Only when an item is genuinely included AND it is on the learned list,
   set "personalized": true and add "You order this often" to the reason.
5. A short, correct cart (even 2-3 items) is far better than padding it with
   irrelevant favorites. NEVER pad a cart to hit a size — relevance over count.
"""


def build_disliked_block(user_profile):
    """Feature: Confidence Feedback Loop — turn removals into an avoid-list."""
    disliked = (user_profile or {}).get("disliked_items") or {}
    if not disliked:
        return ""

    top = sorted(
        disliked.items(), key=lambda kv: int(kv[1].get("count", 0)), reverse=True
    )[:8]
    lines = []
    for pid, info in top:
        ctx = info.get("last_context")
        ctx_str = f" (last removed during: {ctx})" if ctx else ""
        lines.append(
            f"  - {info.get('name', pid)} — removed {int(info.get('count', 0))} "
            f"time(s){ctx_str}"
        )

    return f"""

NEGATIVE SIGNALS (items this user has REMOVED from past carts):
{chr(10).join(lines)}

AVOID-LIST RULES:
- Treat the items above as disliked. Do NOT include them unless the user's
  CURRENT message explicitly asks for them by name.
- If a removed item would normally fit the situation, pick a different
  relevant item from the catalog instead — never leave the cart worse.
"""


def build_personalization_block(user_profile):
    if not user_profile:
        return ""

    name = user_profile.get("name", "the user")
    city = user_profile.get("city", "")
    header = f"\n\nPERSONALIZATION CONTEXT — preferences for {name}"
    if city:
        header += f" ({city})"
    header += ":"

    parts = [header]

    brands = user_profile.get("favorite_brands") or {}
    if brands:
        parts.append("  Favorite brands (when category matches):")
        parts.extend([f"    - {category}: {brand}" for category, brand in brands.items()])

    if user_profile.get("purchase_history_summary"):
        parts.append("  Purchase summary: " + user_profile["purchase_history_summary"])
    if user_profile.get("household_context"):
        parts.append("  Household context: " + user_profile["household_context"])

    brand_rules = """

PERSONALIZATION RULES:
- When picking items where the user has a known brand preference for that
  category, prefer products matching those brands when available.
- In the "reason" field for those items, briefly acknowledge it
  (e.g. "Maggi — your usual choice").
- Use household context to tune the cart (e.g. elderly + BP medication →
  prioritize backup power for medical devices).
- Do NOT mention preferences for items with no preference match."""

    learned_block = build_learned_history_block(user_profile)
    disliked_block = build_disliked_block(user_profile)

    return "\n".join(parts) + brand_rules + learned_block + disliked_block


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
USE WHEN: situation clear AND you can pick at least 3 RELEVANT items with
confidence >= 0.7. Aim for 3-6 items, but include ONLY items that genuinely
fit — a tight 3-item cart beats a padded 6-item one.
OUTPUT: cart_title named after primary problem; clarifying_question MUST be null.

MODE B: "best_guess"
USE WHEN: message implies SOME direction but is partially underspecified,
OR the catalog only partially covers the need.
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
- EVERY item must directly serve the user's PRIMARY need. Before adding an
  item, ask: "Does this solve THIS situation?" If no, leave it out.
- If the catalog has NO good match for the core need (e.g. user asks for a
  remote battery but no battery exists), do NOT substitute unrelated items
  like food or drinks. Instead either return only the items that genuinely
  fit, or use best_guess / clarifying_question. An honest small or empty cart
  is better than a wrong one.
- Do NOT include an item just because the user ordered it before. Past orders
  never justify an item that doesn't fit the current situation.
- Theme hints:
  - Power Cut: candles, LED bulb, power bank, instant food (Maggi), cold drinks.
  - Health/Fever/Cold: OTC items (Vicks, Strepsils, Crocin, ORS, honey, ginger tea, tissues).
  - Guests / dinner: paneer, naan, snacks, beverages, dessert, ice, ready meals.
  - Pooja / festival: diyas, camphor, agarbatti, kalawa, coconut, marigold, gangajal.
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

CATALOG ({len(catalog)} products available):
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

CATALOG ({len(catalog)} products available):
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


def _json_safe(obj):
    """Recursively convert DynamoDB Decimals so json.dumps won't choke."""
    if isinstance(obj, list):
        return [_json_safe(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj


def apply_personalization_flags(result, user_profile):
    """
    Deterministic safety net: guarantees personalization_applied and
    personalized flags are correct, even if Nova Lite skips them.
    Matches item names against the user's favorite_brands AND against
    products they've actually ordered before (learned history).
    """
    favorite_brands = []
    learned_ids = set()
    if user_profile:
        favorite_brands = [
            b for b in user_profile.get("favorite_brands", {}).values() if b
        ]
        learned_ids = set((user_profile.get("item_counts") or {}).keys())

    def process_cart(cart):
        any_personalized = False
        for item in cart.get("items", []):
            name = item.get("name", "").lower()
            pid = item.get("product_id")
            matched_brand = None
            for brand in favorite_brands:
                if brand.lower() in name:
                    matched_brand = brand
                    break
            if matched_brand:
                item["personalized"] = True
                any_personalized = True
                reason = item.get("reason", "")
                if matched_brand.lower() not in reason.lower():
                    item["reason"] = f"{reason} {matched_brand} — your usual choice."
            elif pid in learned_ids:
                item["personalized"] = True
                any_personalized = True
                reason = item.get("reason", "")
                if "order" not in reason.lower():
                    item["reason"] = f"{reason} You order this often.".strip()
            else:
                item.setdefault("personalized", False)
        cart["personalization_applied"] = any_personalized
        return cart

    if "items" in result:
        process_cart(result)
    elif "carts" in result:
        for cart in result["carts"]:
            process_cart(cart)

    return result


def fix_delivery_note(cart):
    """
    Deterministic fix: only set delivery_note if some item has
    eta_min STRICTLY > 20. Overrides model's cosmetic mistakes.
    """
    items = cart.get("items", [])
    slow_items = [i for i in items if i.get("eta_min", 0) > 20]
    if not slow_items:
        cart["delivery_note"] = None
    else:
        slow = slow_items[0]
        cart["delivery_note"] = (
            f"Most items arrive in ~12 mins, but {slow.get('name')} takes "
            f"about {slow.get('eta_min')} mins — remove it if you need "
            f"everything faster."
        )
    return cart


def fix_safety_note(cart):
    """
    Deterministic fix: safety_note must EITHER be the exact standard
    medical disclaimer OR null. Nova Lite sometimes invents its own
    (non-medical) safety notes — e.g. "keep candles away from children".
    Those are not part of the spec, so we strip them.
    """
    note = cart.get("safety_note")
    if note is not None and note != STANDARD_SAFETY_NOTE:
        cart["safety_note"] = None
    return cart


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

        action = body.get("action", "generate")
        user_id = body.get("user_id")

        # ----- Record an order into learned history -----
        if action == "record_order":
            if not user_id:
                return _response(400, {"error": "user_id is required to record an order"})
            items = body.get("items") or []
            if not items:
                return _response(400, {"error": "items list is required"})
            profile = record_order(user_id, items, body.get("name"))
            return _response(200, {
                "status": "recorded",
                "user_id": user_id,
                "order_count": int(profile["order_count"]),
                "learned_items": _json_safe(profile.get("item_names", {})),
                "item_counts": _json_safe(profile.get("item_counts", {})),
            })

        # ----- Record an item removal (Confidence Feedback Loop) -----
        if action == "record_removal":
            if not user_id:
                return _response(400, {"error": "user_id is required to record a removal"})
            items = body.get("items") or []
            if not items:
                return _response(400, {"error": "items list is required"})
            profile = record_removal(user_id, items, body.get("context"))
            return _response(200, {
                "status": "removal_recorded",
                "user_id": user_id,
                "disliked_items": _json_safe(profile.get("disliked_items", {})),
            })

        # ----- Suggest a substitute for an out-of-stock item (Smart Substitution) -----
        if action == "substitute":
            product_id = body.get("product_id")
            if not product_id:
                return _response(400, {"error": "product_id is required"})
            catalog = get_full_catalog()
            substitute = find_substitute(
                product_id, catalog, exclude_ids=body.get("exclude_ids")
            )
            if not substitute:
                return _response(200, {"substitute": None, "product_id": product_id})
            return _response(200, {
                "product_id": product_id,
                "substitute": _json_safe(substitute),
            })

        # ----- Fetch a profile (so the UI can show what's remembered) -----
        if action == "get_profile":
            if not user_id:
                return _response(400, {"error": "user_id is required"})
            profile = get_user_preferences(user_id)
            if not profile:
                return _response(200, {"exists": False, "user_id": user_id})
            return _response(200, {"exists": True, **_json_safe(profile)})

        # ----- Default: generate a cart -----
        user_text = body.get("user_text", "").strip()
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
        result = apply_personalization_flags(result, user_profile)

        if "items" in result:
            result = fix_delivery_note(result)
            result = fix_safety_note(result)
        elif "carts" in result:
            for cart in result["carts"]:
                fix_delivery_note(cart)
                fix_safety_note(cart)

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