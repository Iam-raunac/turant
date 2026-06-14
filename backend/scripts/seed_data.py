"""
Seeds DynamoDB tables from local JSON files in backend/data/.

Run this locally (after setup_dynamodb.py):
    python3 seed_data.py

Tables seeded:
- Catalog            — from catalog.json
- SituationPlaybooks — from situation_playbooks.json (legacy)
- UserPreferences    — from user_preferences.json (Feature 2b)
"""

import json
import os
import time
import boto3

REGION = "us-east-1"
dynamodb = boto3.resource("dynamodb", region_name=REGION)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SECONDS_PER_DAY = 86400


def _load_catalog_categories():
    """product_id -> category lookup, used to build category_counts."""
    with open(os.path.join(DATA_DIR, "catalog.json")) as f:
        products = json.load(f)
    return {p["product_id"]: p.get("category", "general") for p in products}


def expand_seed_orders(profile, categories):
    """Convert a demo user's `_seed_orders` shorthand into the same learned-
    history fields that record_order() produces at runtime.

    Each entry {product_id, name, count, days_ago} becomes:
      - item_counts[pid]        = count
      - item_names[pid]         = name
      - category_counts[cat]   += count
      - item_last_ordered[pid]  = now - days_ago (backdated, so the Reorder
                                  Prediction feature visibly fires in demos)
    The timestamps are real Unix seconds — the reorder engine treats this
    exactly like genuine order history; nothing is faked at query time.
    """
    seed_orders = profile.pop("_seed_orders", None)
    if not seed_orders:
        return profile

    now_ts = int(time.time())
    item_counts = profile.get("item_counts") or {}
    item_names = profile.get("item_names") or {}
    category_counts = profile.get("category_counts") or {}
    item_last_ordered = profile.get("item_last_ordered") or {}

    total_orders = 0
    for entry in seed_orders:
        pid = entry["product_id"]
        count = int(entry.get("count", 1))
        item_counts[pid] = int(item_counts.get(pid, 0)) + count
        item_names[pid] = entry.get("name", pid)
        item_last_ordered[pid] = now_ts - int(entry.get("days_ago", 0)) * SECONDS_PER_DAY
        cat = categories.get(pid, "general")
        category_counts[cat] = int(category_counts.get(cat, 0)) + count
        total_orders += count

    profile["item_counts"] = item_counts
    profile["item_names"] = item_names
    profile["category_counts"] = category_counts
    profile["item_last_ordered"] = item_last_ordered
    profile["order_count"] = int(profile.get("order_count", 0)) + total_orders
    profile["last_order_ts"] = now_ts
    return profile


def seed_catalog():
    with open(os.path.join(DATA_DIR, "catalog.json")) as f:
        products = json.load(f)

    table = dynamodb.Table("Catalog")
    with table.batch_writer() as batch:
        for product in products:
            batch.put_item(Item=product)

    print(f"Seeded {len(products)} products into Catalog table.")


def seed_playbooks():
    path = os.path.join(DATA_DIR, "situation_playbooks.json")
    if not os.path.exists(path):
        print("Skipping playbooks (file not found — legacy table, OK to skip).")
        return

    with open(path) as f:
        playbooks = json.load(f)

    table = dynamodb.Table("SituationPlaybooks")
    for situation_id, playbook in playbooks.items():
        item = {"situation_id": situation_id, **playbook}
        table.put_item(Item=item)

    print(f"Seeded {len(playbooks)} situation playbooks into SituationPlaybooks table.")


def seed_user_preferences():
    path = os.path.join(DATA_DIR, "user_preferences.json")
    if not os.path.exists(path):
        print("Skipping user preferences (file not found).")
        return

    with open(path) as f:
        users = json.load(f)

    categories = _load_catalog_categories()
    table = dynamodb.Table("UserPreferences")
    for user_id, profile in users.items():
        profile = expand_seed_orders(profile, categories)
        table.put_item(Item=profile)

    print(f"Seeded {len(users)} user profiles into UserPreferences table.")


if __name__ == "__main__":
    seed_catalog()
    seed_playbooks()
    seed_user_preferences()
    print("\nSeeding complete. You can now test the Lambda function.")
