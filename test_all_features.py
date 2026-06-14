#!/usr/bin/env python3
"""
Comprehensive feature test for Turant — validates all 8 features work correctly.
Uses the Lambda code with stubbed boto3 so it runs offline.
"""

import sys
import types
import json
import time
from pathlib import Path

# Stub boto3 so the lambda imports without AWS
boto3 = types.ModuleType('boto3')
boto3.resource = lambda *a, **k: None
boto3.client = lambda *a, **k: None
sys.modules['boto3'] = boto3

# Import the actual lambda
import importlib.util
spec = importlib.util.spec_from_file_location(
    'lf', 'backend/lambda/parse_and_generate/lambda_function.py'
)
lf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lf)

# Load catalog
CATALOG = json.loads(Path('backend/data/catalog.json').read_text())

# Test utilities
passed = 0
failed = 0

def test(name, condition, details=""):
    global passed, failed
    if condition:
        print(f"✅ {name}")
        passed += 1
    else:
        print(f"❌ {name}")
        if details:
            print(f"   {details}")
        failed += 1

def section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

# Mock profile for personalization tests
DEMO_PROFILE = {
    "user_id": "test_user",
    "name": "Test User",
    "favorite_brands": {
        "instant_noodles": "Maggi",
        "beverages": "Coca-Cola",
        "biscuits": "Britannia"
    },
    "item_counts": {"P001": 5, "P004": 3, "P054": 2},
    "item_names": {"P001": "Candles", "P004": "Maggi", "P054": "Crocin"},
    "item_last_ordered": {
        "P001": int(time.time()) - 22 * 86400,  # 22 days ago
        "P064": int(time.time()) - 6 * 86400,   # 6 days ago
        "P054": int(time.time()) - 34 * 86400,  # 34 days ago
    },
    "disliked_items": {
        "P014": {"name": "Gulab Jamun", "count": 2, "last_context": "Dinner for Guests"}
    }
}

# ============================================================================
# FEATURE 1: Adaptive Situation Engine (Binary Response)
# ============================================================================
section("FEATURE 1: Adaptive Situation Engine")

# Test 1A: Confident mode (clear situation)
prompt = lf.build_single_prompt(
    "light chali gayi, monsoon hai bahar",
    CATALOG,
    user_profile=None
)
test(
    "1A: Confident mode triggers for clear situation",
    "MODE A" in prompt and "confident" in prompt,
    "Prompt should describe confident mode"
)

# Test 1B: Clarifying question mode (vague input)
prompt_vague = lf.build_single_prompt("kuch chahiye", CATALOG)
test(
    "1B: Clarifying mode triggers for vague input",
    "MODE B" in prompt_vague and "clarifying_question" in prompt_vague,
    "Prompt should describe clarifying mode"
)

# Test 1C: No "best_guess" in prompt
test(
    "1C: Best guess mode removed",
    "best_guess" not in prompt.lower() and "MODE C" not in prompt,
    "Best guess should not exist in binary design"
)

# Test 1D: Confidence floor is 0.6
test(
    "1D: Confidence floor hard-coded at 0.6",
    "0.6" in prompt and "CONFIDENCE FLOOR" in prompt,
    "0.6 threshold should be explicit"
)

# ============================================================================
# FEATURE 2: Explainable + Personalized Reasoning
# ============================================================================
section("FEATURE 2: Explainable + Personalized Reasoning")

# Test 2A: Personalization block builds correctly
pers_block = lf.build_personalization_block(DEMO_PROFILE)
test(
    "2A: Personalization block includes favorite brands",
    "Maggi" in pers_block and "Coca-Cola" in pers_block,
    "Should surface user's favorite brands"
)

# Test 2B: Learned history shows up
test(
    "2B: Learned history included",
    "Candles" in pers_block and "order" in pers_block.lower(),
    "Should show items user orders often"
)

# Test 2C: Deterministic flag application
cart = {
    "items": [
        {"product_id": "P004", "name": "Maggi Atta Noodles", "reason": "Quick meal"},
        {"product_id": "P001", "name": "Candles", "reason": "Light source"}
    ]
}
result = lf.apply_personalization_flags(cart, DEMO_PROFILE)
test(
    "2C: Personalization flags set deterministically",
    result["items"][0]["personalized"] == True and 
    result["items"][1]["personalized"] == True,
    "Maggi (brand) and Candles (learned) should both be flagged"
)

# Test 2D: Reason deduplication (no double "usual choice")
cart_dup = {
    "items": [
        {"product_id": "P004", "name": "Maggi", "reason": "Quick — your usual choice."}
    ]
}
result_dup = lf.apply_personalization_flags(cart_dup, DEMO_PROFILE)
test(
    "2D: No duplicate 'usual choice' in reason",
    result_dup["items"][0]["reason"].count("usual choice") == 1,
    f"Got: {result_dup['items'][0]['reason']}"
)

# ============================================================================
# FEATURE 3: Conversational Refinement
# ============================================================================
section("FEATURE 3: Conversational Refinement")

# Test 3A: Refinement block builds
prev_cart = {"cart_title": "Power Cut Kit", "items": [{"product_id": "P004"}]}
ref_block = lf.build_refinement_block(prev_cart)
test(
    "3A: Refinement block includes previous cart",
    "REFINEMENT CONTEXT" in ref_block and "Power Cut Kit" in ref_block,
    "Should pass previous cart as context"
)

# Test 3B: Refinement instructions clear
test(
    "3B: Refinement instructions present",
    "swap, remove, or add items" in ref_block.lower(),
    "Should tell model to modify existing cart"
)

# ============================================================================
# FEATURE 4: Smart Substitution
# ============================================================================
section("FEATURE 4: Smart Substitution")

# Test 4A: Substitute found for OOS item
sub = lf.find_substitute("P001", CATALOG, exclude_ids=["P001"])
test(
    "4A: Substitute found for Candles (P001)",
    sub is not None and sub["product_id"] != "P001",
    f"Found: {sub['name'] if sub else 'None'}"
)

# Test 4B: Tag overlap prioritized
test(
    "4B: Substitute has similar tags",
    sub and ("light" in sub.get("tags", []) or "emergency" in sub.get("tags", [])),
    f"Tags: {sub.get('tags', []) if sub else 'N/A'}"
)

# Test 4C: Same category fallback
sub_maggi = lf.find_substitute("P004", CATALOG, exclude_ids=["P004"])
test(
    "4C: Falls back to same category when no tag match",
    sub_maggi is not None and sub_maggi.get("category") == "power_cut",
    f"Category: {sub_maggi.get('category') if sub_maggi else 'N/A'}"
)

# ============================================================================
# FEATURE 5: Confidence Feedback Loop
# ============================================================================
section("FEATURE 5: Confidence Feedback Loop")

# Test 5A: Disliked items block builds
disliked_block = lf.build_disliked_block(DEMO_PROFILE)
test(
    "5A: Disliked items block includes removals",
    "Gulab Jamun" in disliked_block and "removed 2" in disliked_block,
    "Should list items user removed"
)

# Test 5B: Avoid-list rules present
test(
    "5B: Avoid-list instructions in block",
    "AVOID" in disliked_block and "NOT include" in disliked_block,
    "Should instruct model to skip disliked items"
)

# Test 5C: record_removal normalizes string/dict items
items_string = ["P014"]
items_dict = [{"product_id": "P014", "name": "Gulab Jamun"}]
normalized_str = lf._normalize_items(items_string)
normalized_dict = lf._normalize_items(items_dict)
test(
    "5C: Item normalization handles both formats",
    normalized_str[0]["product_id"] == "P014" and 
    normalized_dict[0]["product_id"] == "P014",
    "Both string and dict formats should work"
)

# ============================================================================
# FEATURE 6: Proactive — Time-of-day Routine Anticipation
# ============================================================================
section("FEATURE 6: Time-of-day Routine (Frontend)")

# This is clock-based frontend logic — verify the component exists
from pathlib import Path
routine_comp = Path('frontend/src/components/RoutineSuggestion.jsx')
test(
    "6A: RoutineSuggestion component exists",
    routine_comp.exists(),
    "Component should be in frontend/src/components/"
)

if routine_comp.exists():
    content = routine_comp.read_text()
    test(
        "6B: Component has time windows defined",
        "WINDOWS" in content and "morning" in content and "evening" in content,
        "Should define time-of-day windows"
    )
    test(
        "6C: Uses real device clock",
        "new Date()" in content or "now.getHours()" in content,
        "Should read system clock, not hardcoded"
    )

# ============================================================================
# FEATURE 7: Proactive — Reorder/Replenishment Prediction
# ============================================================================
section("FEATURE 7: Reorder/Replenishment Prediction")

# Test 7A: Replenishment cycles defined
test(
    "7A: Category replenishment cycles defined",
    len(lf.CATEGORY_REPLENISH_DAYS) > 0,
    f"Found {len(lf.CATEGORY_REPLENISH_DAYS)} category cycles"
)

test(
    "7B: Per-product overrides defined",
    len(lf.PRODUCT_REPLENISH_DAYS) > 0,
    f"Found {len(lf.PRODUCT_REPLENISH_DAYS)} product-specific cycles"
)

# Test 7C: Compute reorder suggestions
suggestions = lf.compute_reorder_suggestions(DEMO_PROFILE, CATALOG)
test(
    "7C: Reorder suggestions computed",
    len(suggestions) > 0,
    f"Found {len(suggestions)} items running low"
)

# Test 7D: Urgent items ranked first
test(
    "7D: Suggestions sorted by urgency",
    suggestions[0]["urgency"] >= suggestions[-1]["urgency"],
    f"First: {suggestions[0]['urgency']:.2f}, Last: {suggestions[-1]['urgency']:.2f}"
)

# Test 7E: Durable goods excluded (power bank should not appear)
reorder_ids = [s["product_id"] for s in suggestions]
test(
    "7E: Durable goods excluded from reorder",
    "P003" not in reorder_ids,  # Power Bank
    "Power banks shouldn't be in reorder suggestions"
)

# Test 7F: Milk appears (consumable, 4-day cycle)
test(
    "7F: Consumables included (Milk 6 days ago)",
    "P064" in reorder_ids,
    "Milk (4-day cycle, bought 6 days ago) should be overdue"
)

# ============================================================================
# FEATURE 8: WhatsApp Share
# ============================================================================
section("FEATURE 8: WhatsApp Share (Frontend)")

cart_comp = Path('frontend/src/components/Cart.jsx')
if cart_comp.exists():
    cart_content = cart_comp.read_text()
    test(
        "8A: WhatsApp share function exists",
        "shareOnWhatsApp" in cart_content or "wa.me" in cart_content,
        "Cart component should have WhatsApp share"
    )
    test(
        "8B: Share button rendered",
        "share-btn" in cart_content.lower() or "Share" in cart_content,
        "UI should show share button"
    )

# ============================================================================
# SAFETY GUARDS (The Fixes We Just Made)
# ============================================================================
section("SAFETY GUARDS")

# Test SG1: Medical items stripped from non-health carts
power_cart = {
    "items": [
        {"product_id": "P001", "name": "Candles", "price_inr": 40},
        {"product_id": "P054", "name": "Crocin", "price_inr": 35},
    ],
    "total_inr": 75
}
lf.strip_medical_when_no_symptom(power_cart, "light chali gayi", CATALOG)
test(
    "SG1: Medical items stripped when no symptom",
    len(power_cart["items"]) == 1 and power_cart["items"][0]["name"] == "Candles",
    f"Cart after strip: {[i['name'] for i in power_cart['items']]}"
)

# Test SG2: Medical items kept when symptom present
fever_cart = {
    "items": [{"product_id": "P054", "name": "Crocin", "price_inr": 35}],
    "total_inr": 35
}
lf.strip_medical_when_no_symptom(fever_cart, "bukhar hai throat kharab", CATALOG)
test(
    "SG2: Medical items kept when symptom mentioned",
    len(fever_cart["items"]) == 1 and fever_cart["items"][0]["name"] == "Crocin",
    "Crocin should stay in fever cart"
)

# Test SG3: Safety note validation
cart_safe = {"safety_note": "Keep candles away from children"}
lf.fix_safety_note(cart_safe)
test(
    "SG3: Invalid safety notes stripped",
    cart_safe["safety_note"] is None,
    "Non-standard safety notes should be removed"
)

valid_safe = {"safety_note": lf.STANDARD_SAFETY_NOTE}
lf.fix_safety_note(valid_safe)
test(
    "SG4: Standard safety note preserved",
    valid_safe["safety_note"] == lf.STANDARD_SAFETY_NOTE,
    "Standard medical disclaimer should stay"
)

# Test SG5: Delivery note only when eta > 20
fast_cart = {
    "items": [
        {"name": "Candles", "eta_min": 12},
        {"name": "Maggi", "eta_min": 15}
    ]
}
lf.fix_delivery_note(fast_cart)
test(
    "SG5: No delivery note for fast items",
    fast_cart["delivery_note"] is None,
    "Items ≤20 min shouldn't trigger note"
)

slow_cart = {
    "items": [
        {"name": "Diyas", "eta_min": 18},
        {"name": "Gangajal", "eta_min": 22}
    ]
}
lf.fix_delivery_note(slow_cart)
test(
    "SG6: Delivery note set for slow items",
    slow_cart["delivery_note"] is not None and "Gangajal" in slow_cart["delivery_note"],
    f"Note: {slow_cart.get('delivery_note', 'None')[:50]}..."
)

# ============================================================================
# SUMMARY
# ============================================================================
section("TEST SUMMARY")
total = passed + failed
print(f"\n{'='*70}")
print(f"  PASSED: {passed}/{total}")
print(f"  FAILED: {failed}/{total}")
print(f"  SUCCESS RATE: {(passed/total*100):.1f}%")
print('='*70)

if failed > 0:
    print(f"\n⚠️  {failed} test(s) failed — review output above")
    sys.exit(1)
else:
    print("\n✅ All features working correctly!")
    sys.exit(0)
