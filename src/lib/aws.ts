import { CloudFormationClient, CreateStackCommand, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { CloudFrontClient, ListDistributionsCommand, GetDistributionCommand } from '@aws-sdk/client-cloudfront'
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs'

const REGION = 'us-east-1' // Lambda@Edge requirement

function hasAwsCreds(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
}

function getCf(): CloudFormationClient {
  return new CloudFormationClient({ region: REGION })
}

function getCloudFront(): CloudFrontClient {
  return new CloudFrontClient({ region: REGION })
}

function getCw(): CloudWatchLogsClient {
  return new CloudWatchLogsClient({ region: REGION })
}

// Minimal CloudFormation template: Lambda@Edge + CloudFront with custom origin to GTM
export function buildProxyTemplate(stackName: string, domain: string) {
  const lambdaCode = `
    'use strict';
    exports.handler = async (event) => {
      try {
        // Always return the request object to prevent 503 errors
        if (!event || !event.Records || !event.Records[0] || !event.Records[0].cf) {
          console.log('Invalid event structure, passing through');
          return event.Records[0].cf.request || {};
        }
        
        const request = event.Records[0].cf.request;
        if (!request) {
          console.log('No request object, passing through');
          return {};
        }
        
        const headers = request.headers || {};
        const cookies = (headers.cookie && headers.cookie[0] && headers.cookie[0].value) || '';
        const hasConsent = /(?:^|;\s*)cg_consent=1(?:;|$)/.test(cookies);
        const path = request.uri || '';
        const blocked = /\/gtm\.js|\/ns\.html|\/gtm\/|collect/i.test(path);
        
        if (!hasConsent && blocked) {
          if (/\.js$/.test(path)) {
            return { 
              status: '200', 
              statusDescription: 'OK', 
              headers: { 
                'cache-control': [{ key:'Cache-Control', value: 'no-store' }], 
                'content-type': [{ key:'Content-Type', value: 'application/javascript' }] 
              }, 
              body: '/* ConsentGate: blocked until consent */' 
            };
          }
          return { 
            status: '403', 
            statusDescription: 'Forbidden', 
            headers: { 'cache-control': [{ key:'Cache-Control', value: 'no-store' }] }, 
            body: 'Consent required' 
          };
        }
        
        // Always return the request object to continue processing
        return request;
      } catch (error) {
        console.log('Lambda@Edge error:', error);
        // On error, always return the request to prevent 503
        return event.Records[0].cf.request || {};
      }
    };
  `;

  const template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: `ConsentGate proxy for ${domain}`,
    Resources: {
      EdgeRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              { Effect: 'Allow', Principal: { Service: ['lambda.amazonaws.com', 'edgelambda.amazonaws.com'] }, Action: ['sts:AssumeRole'] }
            ]
          },
          ManagedPolicyArns: [
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
          ]
        }
      },
      EdgeFunction: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          FunctionName: { 'Fn::Sub': `consentgate-${domain.replace(/\./g,'-')}` },
          Handler: 'index.handler',
          Runtime: 'nodejs18.x',
          Role: { 'Fn::GetAtt': ['EdgeRole', 'Arn'] },
          Code: { ZipFile: lambdaCode }
        }
      },
      EdgeVersion: {
        Type: 'AWS::Lambda::Version',
        Properties: { FunctionName: { Ref: 'EdgeFunction' } }
      },
      Distribution: {
        Type: 'AWS::CloudFront::Distribution',
        DependsOn: ['EdgeVersion'],
        Properties: {
          DistributionConfig: {
            Enabled: true,
            Comment: { 'Fn::Sub': `ConsentGate for ${domain}` },
            Origins: [
              {
                Id: 'GTMOrigin',
                DomainName: 'www.googletagmanager.com',
                CustomOriginConfig: { 
                  OriginProtocolPolicy: 'https-only',
                  HTTPPort: 443,
                  HTTPSPort: 443,
                  OriginSslProtocols: ['TLSv1.2']
                }
              }
            ],
            DefaultCacheBehavior: {
              TargetOriginId: 'GTMOrigin',
              ViewerProtocolPolicy: 'redirect-to-https',
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
              CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
              ForwardedValues: { 
                QueryString: true, 
                Headers: ['Host', 'Accept', 'Accept-Encoding'],
                Cookies: { Forward: 'all' } 
              },
              Compress: true,
              LambdaFunctionAssociations: [
                {
                  EventType: 'viewer-request',
                  IncludeBody: false,
                  LambdaFunctionARN: { Ref: 'EdgeVersion' }
                }
              ]
            }
          }
        }
      }
    },
    Outputs: {
      CloudFrontDomainName: { Value: { 'Fn::GetAtt': ['Distribution', 'DomainName'] } },
      LambdaVersionArn: { Value: { Ref: 'EdgeVersion' } }
    }
  };

  return JSON.stringify(template)
}

export async function createProxyStack(stackName: string, domain: string) {
  if (!hasAwsCreds()) return { started: false, reason: 'NO_AWS' }
  const cf = getCf()
  const TemplateBody = buildProxyTemplate(stackName, domain)
  await cf.send(new CreateStackCommand({
    StackName: stackName,
    Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM'],
    TemplateBody
  }))
  return { started: true }
}

export async function getStackStatus(stackName: string) {
  if (!hasAwsCreds()) return { ok: false }
  const cf = getCf()
  const resp = await cf.send(new DescribeStacksCommand({ StackName: stackName }))
  const stack = resp.Stacks?.[0]
  if (!stack) return { ok: false }
  const outputs: Record<string,string> = {}
  for (const o of stack.Outputs || []) {
    if (o.OutputKey && o.OutputValue) outputs[o.OutputKey] = o.OutputValue
  }
  return { ok: true, status: stack.StackStatus, outputs }
}

export async function getDistributionDiagnostics(domainName: string, expectedLambdaArn?: string) {
  try {
    const cf = getCloudFront()
    // Find distribution by domain name
    const list = await cf.send(new ListDistributionsCommand({}))
    const dist = list.DistributionList?.Items?.find((d) => d.DomainName === domainName.replace(/^https?:\/\//, '').replace(/\/$/, ''))
    if (!dist?.Id) return { ok: false }

    const details = await cf.send(new GetDistributionCommand({ Id: dist.Id }))
    const status = details.Distribution?.Status // 'Deployed' | 'InProgress'
    const enabled = details.Distribution?.DistributionConfig?.Enabled
    const assoc = details.Distribution?.DistributionConfig?.DefaultCacheBehavior?.LambdaFunctionAssociations
    let viewerRequestArn: string | undefined
    if (assoc && assoc.Quantity && assoc.Items) {
      for (const a of assoc.Items) {
        if (a.EventType === 'viewer-request') {
          viewerRequestArn = a.LambdaFunctionARN
          break
        }
      }
    }
    const matchesExpected = expectedLambdaArn ? viewerRequestArn === expectedLambdaArn : undefined

    return {
      ok: true,
      id: dist.Id,
      domainName: dist.DomainName,
      deploymentStatus: status,
      enabled: !!enabled,
      viewerRequestArn,
      matchesExpected,
    }
  } catch (e) {
    return { ok: false }
  }
}

export async function getLambdaErrorLogs(lambdaArn: string, limit: number = 10) {
  try {
    // Parse function name from ARN: arn:aws:lambda:us-east-1:acct:function:name[:version]
    const parts = lambdaArn.split(':')
    const fnIndex = parts.findIndex((p) => p === 'function')
    if (fnIndex < 0 || !parts[fnIndex + 1]) return { ok: false }
    const functionName = parts[fnIndex + 1]
    const logGroupName = `/aws/lambda/${functionName}`

    const cw = getCw()
    const res = await cw.send(
      new FilterLogEventsCommand({
        logGroupName,
        filterPattern: '?ERROR ?Exception ?"Task timed out"',
        limit,
      })
    )
    const events = (res.events || []).map((e) => ({
      message: e.message || '',
      timestamp: e.timestamp || 0,
      logStreamName: e.logStreamName || '',
    }))
    return { ok: true, events }
  } catch (e) {
    return { ok: false }
  }
}

export async function testCloudFrontDirectly(cloudfrontUrl: string) {
  try {
    // Test the CloudFront URL directly without any path to see if it's reachable
    const testUrl = cloudfrontUrl.replace(/\/$/, '') + '/test'
    const response = await fetch(testUrl, { 
      method: 'GET',
      headers: { 'User-Agent': 'ConsentGate-Test/1.0' }
    })
    
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      reachable: response.status < 500
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      reachable: false
    }
  }
}

