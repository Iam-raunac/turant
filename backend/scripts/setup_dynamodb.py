"""
One-time setup script: creates the 3 DynamoDB tables needed for Ghar Ka Sense.

Run this locally (after `aws configure`):
    python3 setup_dynamodb.py

Uses on-demand (PAY_PER_REQUEST) billing — stays within AWS Free Tier for
hackathon-scale usage and avoids provisioning capacity manually.
"""

import boto3
from botocore.exceptions import ClientError

REGION = "us-east-1"
dynamodb = boto3.client("dynamodb", region_name=REGION)


def create_table_if_not_exists(table_name, key_schema, attribute_definitions):
    try:
        dynamodb.create_table(
            TableName=table_name,
            KeySchema=key_schema,
            AttributeDefinitions=attribute_definitions,
            BillingMode="PAY_PER_REQUEST",
        )
        print(f"Creating table '{table_name}'... (this takes ~10-20 seconds)")
        waiter = dynamodb.get_waiter("table_exists")
        waiter.wait(TableName=table_name)
        print(f"Table '{table_name}' is ready.")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceInUseException":
            print(f"Table '{table_name}' already exists. Skipping.")
        else:
            raise


def main():
    # 1. Catalog table
    create_table_if_not_exists(
        table_name="Catalog",
        key_schema=[{"AttributeName": "product_id", "KeyType": "HASH"}],
        attribute_definitions=[{"AttributeName": "product_id", "AttributeType": "S"}],
    )

    # 2. SituationPlaybooks table
    create_table_if_not_exists(
        table_name="SituationPlaybooks",
        key_schema=[{"AttributeName": "situation_id", "KeyType": "HASH"}],
        attribute_definitions=[{"AttributeName": "situation_id", "AttributeType": "S"}],
    )

    # 3. CartSessions table (for future use / order history within session)
    create_table_if_not_exists(
        table_name="CartSessions",
        key_schema=[{"AttributeName": "session_id", "KeyType": "HASH"}],
        attribute_definitions=[{"AttributeName": "session_id", "AttributeType": "S"}],
    )

    print("\nAll tables ready. Next: run seed_data.py to load catalog + playbooks.")


if __name__ == "__main__":
    main()
