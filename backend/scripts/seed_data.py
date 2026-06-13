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
import boto3

REGION = "us-east-1"
dynamodb = boto3.resource("dynamodb", region_name=REGION)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


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

    table = dynamodb.Table("UserPreferences")
    for user_id, profile in users.items():
        table.put_item(Item=profile)

    print(f"Seeded {len(users)} user profiles into UserPreferences table.")


if __name__ == "__main__":
    seed_catalog()
    seed_playbooks()
    seed_user_preferences()
    print("\nSeeding complete. You can now test the Lambda function.")
