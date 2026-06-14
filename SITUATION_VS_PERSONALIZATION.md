# Critical Rule: Situation vs Personalization

## The Problem This Solves

A common personalization mistake in AI shopping: a user who frequently orders candles (e.g., for power cuts) says "shaam ho gayi kuch khane ka man" (evening, hungry) and gets a **"Power Cut Kit"** because the system confuses *what they often buy* with *what they need right now*.

This ruins trust. The user asked for food, not emergency supplies.

## The Rule (Now Enforced)

**Situation identification** comes ONLY from the **current message**.  
**Item personalization** uses past orders to prefer specific brands/variants.

### In the Lambda Prompt

Two explicit instructions were added:

**STEP 1 (Situation Identification):**
```
CRITICAL: The cart title and situation_understood must reflect the CURRENT
user_text ONLY. Past order history is used ONLY to personalize item selection
— NEVER to determine the situation type.

Example: If user says "shaam ho gayi kuch khane ka man", the title must be
evening/snacks related, NOT "Power Cut Kit" even if they often order candles.
The situation comes from THIS message, not from what they bought before.
```

**Learned History Rules (Item Selection):**
```
CRITICAL: The situation comes from the user's CURRENT message, not from
what they bought before. If user says "shaam ho gayi kuch khane ka man",
that's an evening snacks situation — NOT a power-cut situation even if
they often order candles.

[...]

- Evening snacks → do NOT add candles/power items just because ordered often.
```

## Example Scenarios

### ✅ Correct Behavior

**User profile:**
- Often orders: Candles (10×), Power Bank (3×), Maggi (5×)

**User says:** "shaam ho gayi kuch khane ka man"

**Expected cart:**
- **Title:** Evening Snacks
- **Situation:** User is hungry in the evening
- **Items:** Maggi ✨ (personalized — their usual), Haldiram Namkeen, Cold Drink
- **NOT included:** Candles, Power Bank (wrong situation)

### ❌ Wrong Behavior (Now Prevented)

**Same profile, same message.**

**Old broken behavior:**
- **Title:** Power Cut Kit
- **Reasoning:** "User often orders candles → must need candles"
- **Items:** Candles, LED Bulb, Power Bank
- **Problem:** User asked for food, got emergency supplies

## Where This Is Enforced

1. **Lambda prompt** (`build_single_prompt()` in `parse_and_generate/lambda_function.py`)
   - STEP 1: Situation identification
   - Learned History Rules: Item selection boundaries

2. **README** (3 locations):
   - Feature 2 explanation
   - Architecture → Key Design Principle
   - "What we hard-coded and why"

## Testing

Verification that the rule is present:

```bash
venv/bin/python -c "
import sys, types
boto3=types.ModuleType('boto3'); boto3.resource=lambda *a,**k:None; boto3.client=lambda *a,**k:None
sys.modules['boto3']=boto3
import importlib.util
spec=importlib.util.spec_from_file_location('lf','backend/lambda/parse_and_generate/lambda_function.py')
lf=importlib.util.module_from_spec(spec); spec.loader.exec_module(lf)

profile = {'item_counts': {'P001': 10}, 'item_names': {'P001': 'Candles'}}
prompt = lf.build_single_prompt('shaam ho gayi kuch khane ka man', [], profile)

assert 'CRITICAL' in prompt
assert 'shaam ho gayi kuch khane ka man' in prompt
assert 'evening snacks' in prompt.lower()
assert 'do NOT add candles' in prompt
print('✅ All situation vs personalization rules present')
"
```

## Why This Matters for Judging

This is a **trust** issue. A single wrong cart (food request → power-cut response) destroys the "confident mode" pitch. The judge sees:
1. The user asked for X
2. The cart gave Y
3. The system doesn't understand basic intent

By explicitly separating situation (from message) and personalization (from history), we prevent this class of error and can confidently demo with power users who have rich order histories.

## Prompt Engineering Principle

This follows the "Code > Model" design pattern used throughout Turant:
- **Model's job:** Creative product selection within boundaries
- **Code's job:** Hard rules that must never break

Situation identification is a hard rule. The prompt tells the model twice (STEP 1 + Learned History Rules), with concrete counter-examples, so there's no ambiguity.
