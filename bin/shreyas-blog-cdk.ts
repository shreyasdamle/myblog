#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ShreyasBlogCdkStack } from '../lib/shreyas-blog-cdk-stack';

const app = new cdk.App();
new ShreyasBlogCdkStack(app, 'ShreyasBlogCdkStack');
