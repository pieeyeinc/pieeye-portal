import { CloudFormationClient, CreateStackCommand, DescribeStacksCommand, StackStatus } from '@aws-sdk/client-cloudformation'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// AWS Configuration
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}

export const cloudFormationClient = new CloudFormationClient(awsConfig)
export const s3Client = new S3Client(awsConfig)

// CloudFormation Stack Status Types
export type StackStatusType = 
  | 'CREATE_IN_PROGRESS'
  | 'CREATE_COMPLETE'
  | 'CREATE_FAILED'
  | 'UPDATE_IN_PROGRESS'
  | 'UPDATE_COMPLETE'
  | 'UPDATE_FAILED'
  | 'DELETE_IN_PROGRESS'
  | 'DELETE_COMPLETE'
  | 'DELETE_FAILED'

// Interface for stack creation result
export interface StackCreationResult {
  stackId: string
  stackName: string
  status: StackStatusType
  outputs?: {
    CloudFrontURL?: string
    LambdaArn?: string
    S3BucketName?: string
  }
}

// Create CloudFormation stack
export async function createProxyStack(
  stackName: string,
  domainName: string
): Promise<StackCreationResult> {
  try {
    // Read the CloudFormation template
    const fs = await import('fs/promises')
    const path = await import('path')
    const templatePath = path.join(process.cwd(), 'templates', 'template-proxy.yaml')
    const templateBody = await fs.readFile(templatePath, 'utf-8')
    
    const command = new CreateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      Parameters: [
        {
          ParameterKey: 'DomainName',
          ParameterValue: domainName,
        },
      ],
      Capabilities: ['CAPABILITY_IAM'],
      Tags: [
        {
          Key: 'Project',
          Value: 'ConsentGate',
        },
        {
          Key: 'Environment',
          Value: 'Production',
        },
        {
          Key: 'Domain',
          Value: domainName,
        },
      ],
    })

    const response = await cloudFormationClient.send(command)
    
    return {
      stackId: response.StackId || '',
      stackName: stackName,
      status: 'CREATE_IN_PROGRESS',
    }
  } catch (error) {
    console.error('Error creating CloudFormation stack:', error)
    throw new Error(`Failed to create stack: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Get stack status and outputs
export async function getStackStatus(stackName: string): Promise<StackCreationResult> {
  try {
    const command = new DescribeStacksCommand({
      StackName: stackName,
    })

    const response = await cloudFormationClient.send(command)
    const stack = response.Stacks?.[0]

    if (!stack) {
      throw new Error('Stack not found')
    }

    const outputs: Record<string, string> = {}
    if (stack.Outputs) {
      stack.Outputs.forEach(output => {
        if (output.OutputKey && output.OutputValue) {
          outputs[output.OutputKey] = output.OutputValue
        }
      })
    }

    return {
      stackId: stack.StackId || '',
      stackName: stack.StackName || '',
      status: (stack.StackStatus as StackStatusType) || 'CREATE_FAILED',
      outputs: {
        CloudFrontURL: outputs.CloudFrontURL,
        LambdaArn: outputs.LambdaArn,
        S3BucketName: outputs.S3BucketName,
      },
    }
  } catch (error) {
    console.error('Error getting stack status:', error)
    throw new Error(`Failed to get stack status: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Upload GTM proxy script to S3
export async function uploadProxyScript(bucketName: string, cloudfrontUrl: string): Promise<void> {
  try {
    const gtmScript = `
// ConsentGate GTM Proxy Script
(function() {
  'use strict';
  
  // Check if consent has been given
  function hasConsent() {
    // Check for common consent cookies
    const consentCookies = [
      'cg_consent=true',
      'consent=accepted',
      'cookieconsent=allow',
      'didomi_token=',
      'OptanonConsent='
    ];
    
    return consentCookies.some(cookie => 
      document.cookie.includes(cookie)
    );
  }
  
  // Only load GTM if consent is given
  if (hasConsent()) {
    // Load the original GTM script
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-XXXXXXX');
  } else {
    // Log that consent is required
    console.log('ConsentGate: GTM loading blocked - user consent required');
  }
})();
`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'gtm.js',
      Body: gtmScript,
      ContentType: 'application/javascript',
      CacheControl: 'public, max-age=3600',
    })

    await s3Client.send(command)
    console.log(`GTM proxy script uploaded to ${bucketName}/gtm.js`)
  } catch (error) {
    console.error('Error uploading GTM script:', error)
    throw new Error(`Failed to upload GTM script: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Poll stack status until completion
export async function pollStackCompletion(
  stackName: string,
  onProgress: (status: StackCreationResult) => void,
  maxAttempts: number = 60,
  intervalMs: number = 10000
): Promise<StackCreationResult> {
  let attempts = 0
  
  while (attempts < maxAttempts) {
    try {
      const status = await getStackStatus(stackName)
      onProgress(status)
      
      if (status.status === 'CREATE_COMPLETE') {
        return status
      } else if (status.status === 'CREATE_FAILED') {
        throw new Error('Stack creation failed')
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs))
      attempts++
    } catch (error) {
      console.error(`Error polling stack status (attempt ${attempts + 1}):`, error)
      attempts++
      
      if (attempts >= maxAttempts) {
        throw error
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }
  
  throw new Error('Stack creation timed out')
}
