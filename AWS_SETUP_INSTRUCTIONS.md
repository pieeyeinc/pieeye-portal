# AWS Credentials Setup Instructions

## 1. Create AWS IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. **User name**: `consentgate-proxy-provisioner`
4. **Access type**: Programmatic access
5. Click "Next: Permissions"

## 2. Attach Required Policies

Attach these policies to the user:

### CloudFormation Full Access
- Search for "CloudFormationFullAccess"
- Attach the policy

### S3 Full Access  
- Search for "AmazonS3FullAccess"
- Attach the policy

### Lambda Full Access
- Search for "AWSLambdaFullAccess" 
- Attach the policy

### CloudFront Full Access
- Search for "CloudFrontFullAccess"
- Attach the policy

### IAM PassRole (for Lambda@Edge)
- Create a custom policy with this JSON:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "*"
        }
    ]
}
```

## 3. Get Access Keys

1. After creating the user, go to "Security credentials" tab
2. Click "Create access key"
3. **Use case**: Application running outside AWS
4. Click "Create access key"
5. **IMPORTANT**: Copy both the Access Key ID and Secret Access Key immediately
6. You won't be able to see the secret key again!

## 4. Add to Vercel Environment Variables

Go to your Vercel project dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `pieeye-portal` project
3. Go to "Settings" → "Environment Variables"
4. Add these variables:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

## 5. Test AWS Connection

After adding the environment variables:

1. Redeploy your Vercel app
2. Go to `/dev-tools` page
3. Simulate a domain and subscription
4. Go to `/developer-setup` 
5. Try creating a proxy to test AWS connectivity

## 6. Cost Considerations

**Important**: CloudFormation stacks will create real AWS resources that cost money:

- **CloudFront distributions**: ~$1/month per distribution
- **Lambda@Edge**: Pay per request (very cheap)
- **S3 buckets**: Minimal cost for small files
- **Data transfer**: CloudFront egress costs

**To minimize costs during development:**
- Delete test stacks when done: Go to CloudFormation console and delete stacks
- Use the same domain for testing to avoid creating multiple distributions
- Monitor AWS billing dashboard regularly

## 7. Troubleshooting

### Common Issues:

**"Access Denied" errors:**
- Check IAM policies are attached correctly
- Verify access keys are correct
- Ensure region is set to `us-east-1` (required for CloudFront)

**"Stack creation failed":**
- Check CloudFormation console for detailed error messages
- Verify all required permissions are attached
- Check if stack name already exists (must be unique)

**"Lambda@Edge deployment failed":**
- Ensure IAM user has `iam:PassRole` permission
- Check that Lambda@Edge is supported in your region
