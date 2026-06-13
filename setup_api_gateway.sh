#!/bin/bash
set -e

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"
LAMBDA_NAME="parse_and_generate"
API_NAME="turant-api"

echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"

echo ""
echo "Step 1/8: Creating REST API..."
API_ID=$(aws apigateway create-rest-api \
  --name "$API_NAME" \
  --description "Turant - Confident Mode for Amazon Now" \
  --endpoint-configuration types=REGIONAL \
  --region "$REGION" \
  --query 'id' \
  --output text)
echo "  API ID: $API_ID"

echo ""
echo "Step 2/8: Getting root resource..."
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --region "$REGION" \
  --query 'items[0].id' \
  --output text)
echo "  Root ID: $ROOT_ID"

echo ""
echo "Step 3/8: Creating /parse-cart resource..."
RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$ROOT_ID" \
  --path-part "parse-cart" \
  --region "$REGION" \
  --query 'id' \
  --output text)
echo "  Resource ID: $RESOURCE_ID"

echo ""
echo "Step 4/8: Creating POST method..."
aws apigateway put-method \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method POST \
  --authorization-type NONE \
  --region "$REGION" > /dev/null
echo "  POST method created"

echo ""
echo "Step 5/8: Wiring POST to Lambda..."
aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}/invocations" \
  --region "$REGION" > /dev/null
echo "  Lambda integration set"

echo ""
echo "Step 6/8: Granting API Gateway permission to invoke Lambda..."
aws lambda add-permission \
  --function-name "$LAMBDA_NAME" \
  --statement-id "apigateway-turant-$(date +%s)" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/POST/parse-cart" \
  --region "$REGION" > /dev/null
echo "  Permission granted"

echo ""
echo "Step 7/8: Setting up CORS..."

aws apigateway put-method \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region "$REGION" > /dev/null

aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region "$REGION" > /dev/null

aws apigateway put-method-response \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
  --region "$REGION" > /dev/null

aws apigateway put-integration-response \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'OPTIONS,POST'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
  --region "$REGION" > /dev/null

echo "  CORS configured"

echo ""
echo "Step 8/8: Deploying to prod stage..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name prod \
  --region "$REGION" > /dev/null
echo "  Deployed!"

INVOKE_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/parse-cart"
echo ""
echo "=================================================="
echo "  API Gateway setup COMPLETE"
echo "=================================================="
echo ""
echo "  Invoke URL:"
echo "  $INVOKE_URL"
echo ""
echo "=================================================="

echo "$INVOKE_URL" > ./api_url.txt
echo ""
echo "URL saved to: ./api_url.txt"