#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ShreyasBlogCdkStack } from '../lib/shreyas-blog-cdk-stack';

const app = new cdk.App();
new ShreyasBlogCdkStack(app, 'ShreyasBlogCdkStack', {
    env: { account: '080139344130', region: 'us-west-2' },
    doamin: 'shreyasdamle.com',
    email: 'sd2917@nyu.edu',
    certificate: 'arn:aws:acm:us-east-1:080139344130:certificate/01cf4361-4acb-4215-a3c2-a764bd38dcda',
    disableCache: false
});

app.synth();
