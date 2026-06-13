"""
Seeds the Catalog and SituationPlaybooks DynamoDB tables from the local
JSON files in backend/data/.

Run this locally (after setup_dynamodb.py):
    python3 seed_data.py
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
            # DynamoDB doesn't like float types from json for some configs,
            # but boto3 handles Decimal conversion automatically for ints.
            batch.put_item(Item=product)

    print(f"Seeded {len(products)} products into Catalog table.")


def seed_playbooks():
    with open(os.path.join(DATA_DIR, "situation_playbooks.json")) as f:
        playbooks = json.load(f)

    table = dynamodb.Table("SituationPlaybooks")
    for situation_id, playbook in playbooks.items():
        item = {"situation_id": situation_id, **playbook}
        table.put_item(Item=item)

    print(f"Seeded {len(playbooks)} situation playbooks into SituationPlaybooks table.")


if __name__ == "__main__":
    seed_catalog()
    seed_playbooks()
    print("\nSeeding complete. You can now test the Lambda function.")
