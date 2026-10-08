# SafeRecess Backend

AWS Lambda functions for SafeRecess air quality monitoring system.

## Structure

- `lambda/` - Lambda function code
  - `fetch/` - Fetches air quality data from WAQI API
  - `api/` - API Gateway handlers

## Environment Variables

Required for Lambda functions:
- `WAQI_TOKEN` - API token for WAQI (never commit this)
- `DEMO_INBOX` - Email address for demo alerts

## Deployment

Lambda functions are deployed to AWS. Use AWS SAM CLI or the AWS Console.
