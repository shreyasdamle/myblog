#!usr/bin/env node
import cdk = require('@aws-cdk/core');
import route53 = require('@aws-cdk/aws-route53');
import route53Targets = require('@aws-cdk/aws-route53-targets');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import s3 = require('@aws-cdk/aws-s3');
import s3Deploy = require('@aws-cdk/aws-s3-deployment');
import {GuardDutyNotifier} from './guardduty';

interface ShreaysBlogProps extends cdk.StackProps {
  
  // Domain name for blog
  doamin: string;

  // ARN of the ACM certificate to use with CloudFront
  certificate: string;

  // Email address for GD findings
  email: string;

  /** 
   * CloudFront distribution cache.
   * If enabled, sets the max TTL to 500
   * @default false
  */
 disableCache?: boolean;
}

export class ShreyasBlogCdkStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props: ShreaysBlogProps) {
    super(scope, id, props);

    // Enable GD and send alerts to email
    new GuardDutyNotifier(this, "GuardDuty", {
      identificationString: props.doamin,
      email: props.email
    });

    // Create DNS Zone
    const zone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName: props.doamin
    });

    // Bucket to hold the static website
    const bucket = new s3.Bucket(this, 'Bucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    // Origin access identity to access S3 bucket
    const originAcccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OID', {
      comment: `OAI for ${props.doamin}`
    });

    // Restrict the S3 bucket so that only CloudFront distribution will have access through OAI
    bucket.grantRead(originAcccessIdentity);

    // If CF distribution cache is enabled, sets the max TTL to 500
    const maxTtl = props.disableCache ? cdk.Duration.seconds(500) : undefined

    //CloudFront distribution

    const cdn = new cloudfront.CloudFrontWebDistribution(this, 'CloudFront', {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      originConfigs: [{
        behaviors: [{
          isDefaultBehavior: true,
          maxTtl
        }],
        s3OriginSource: {
          s3BucketSource: bucket,
          originAccessIdentity: originAcccessIdentity
        }
      }],
      aliasConfiguration: {
        names: [props.doamin],
        acmCertRef: props.certificate,
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2018,
        sslMethod: cloudfront.SSLMethod.SNI
      }
    });

    // Content for blog
    const contentDir = './blog-contents';
    
    // Deploy website content to S3 bucket
    new s3Deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3Deploy.Source.asset(contentDir)],
      destinationBucket: bucket,
      distribution: cdn,
      distributionPaths: ['/index.html']
    });

    // DNS alias for CloudFront distribution
    new route53.ARecord(this, 'CloudFrontRecord', {
      recordName: props.doamin + '.',
      zone,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(cdn))
    });
    
    // Configure Outputs
    new cdk.CfnOutput(this, 'URL', {
      description: 'The URL for Blog',
      value: 'https://' + props.doamin
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      description: 'The CloudFront distribution URL',
      value: 'https://' + cdn.domainName
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      description: 'The TLS certicate ARN',
      value: props.certificate
    });

    if (zone.hostedZoneNameServers) {
      new cdk.CfnOutput(this, 'NameServers', {
        description: 'Nameservers for DNS zone',
        value: cdk.Fn.join(', ', zone.hostedZoneNameServers)
      });
    }
  }
}