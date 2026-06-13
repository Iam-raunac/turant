"""
Turant — generate_cart Lambda function
Receives a situation_id (e.g. "power_cut"), fetches the playbook + catalog
from DynamoDB, calls Amazon Bedrock (Nova Lite) to generate a Confident Cart
with reasons + confidence scores, and returns it as JSON.
"""

import json
import os
import boto3

# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------
dynamodb = boto3.resource("dynamodb")
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

PLAYBOOKS_TABLE = os.environ.get("PLAYBOOKS_TABLE", "SituationPlaybooks")
CATALOG_TABLE = os.environ.get("CATALOG_TABLE", "Catalog")

# Use Nova Lite for fast, cheap cart generation
MODEL_ID = "amazon.nova-lite-v1:0"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_playbook(situation_id):
    table = dynamodb.Table(PLAYBOOKS_TABLE)
    response = table.get_item(Key={"situation_id": situation_id})
    return response.get("Item")


def get_products(product_ids):
    table = dynamodb.Table(CATALOG_TABLE)
    products = []
    for pid in product_ids:
        response = table.get_item(Key={"product_id": pid})
        item = response.get("Item")
        if item:
            products.append(item)
    return products


def build_prompt(playbook, products, language="en"):
    """Builds the Bedrock prompt that asks for a strict-JSON Confident Cart."""

    product_lines = []
    for p in products:
        hint = playbook.get("reasoning_hints", {}).get(p["product_id"], "")
        product_lines.append(
            f'- id: {p["product_id"]}, name: "{p["name"]}", '
            f'price_inr: {p["price_inr"]}, hint: "{hint}"'
        )
    product_block = "\n".join(product_lines)

    safety_note = playbook.get("safety_note")
    safety_instruction = (
        f'You MUST include this exact safety_note in your output: "{safety_note}"'
        if safety_note
        else "Set safety_note to null."
    )

    system_prompt = f"""You are Turant, an AI shopping assistant for Amazon Now in India.
You build confident, minimal carts (3-6 items) for urgent situations.
Each item must have a short one-line reason written in simple {language} (Hindi/English mix is fine).

RULES:
- Never suggest medical dosages.
- Never provide a diagnosis.
- {safety_instruction}
- Only pick items from the provided product list below — do not invent products.
- Respond with STRICT JSON only. No markdown, no extra text, no code fences.

Situation: {playbook.get("title_en")}
Description: {playbook.get("description")}

Available products:
{product_block}

OUTPUT FORMAT (strict JSON, no other text):
{{
  "cart_title": "string",
  "situation_understood": "one sentence describing what the AI understood",
  "items": [
    {{"product_id": "string", "name": "string", "reason": "string", "confidence": 0.0, "price_inr": 0}}
  ],
  "safety_note": "string or null",
  "total_inr": 0
}}
"""

    return system_prompt


def call_bedrock(prompt_text):
    """Calls Amazon Nova Lite via the Bedrock Converse API."""
    response = bedrock.converse(
        modelId=MODEL_ID,
        messages=[
            {
                "role": "user",
                "content": [{"text": prompt_text}],
            }
        ],
        inferenceConfig={
            "maxTokens": 800,
            "temperature": 0.3,
        },
    )
    output_text = response["output"]["message"]["content"][0]["text"]
    return output_text


def parse_model_output(raw_text):
    """Strips any accidental code fences and parses JSON."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        # remove a leading "json" language hint if present
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
            body = event  # allow direct test invocation without API Gateway wrapper

        situation_id = body.get("situation_id")
        language = body.get("language", "en")

        if not situation_id:
            return _response(400, {"error": "situation_id is required"})

        playbook = get_playbook(situation_id)
        if not playbook:
            return _response(404, {"error": f"No playbook found for '{situation_id}'"})

        product_ids = playbook.get("core_items", [])
        products = get_products(product_ids)

        prompt = build_prompt(playbook, products, language)
        raw_output = call_bedrock(prompt)
        cart = parse_model_output(raw_output)

        return _response(200, cart)

    except json.JSONDecodeError as e:
        return _response(500, {"error": "Failed to parse model output", "details": str(e)})
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
