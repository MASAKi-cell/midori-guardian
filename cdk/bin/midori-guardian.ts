#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { IotStack } from "../lib/iot-stack";
import { MidoriGuardianStack } from "../lib/midori-guardian-stack";

const app = new cdk.App();

const TAG_KEY= process.env.TAG_KEY;
const TAG_NAME = process.env.TAG_NAME;
const CDK_DEFAULT_ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT;
const CDK_DEFAULT_REGION = process.env.CDK_DEFAULT_REGION;
if (!TAG_KEY || !TAG_NAME || !CDK_DEFAULT_ACCOUNT || !CDK_DEFAULT_REGION) {
  const missing = [
    !TAG_KEY && "TAG_KEY",
    !TAG_NAME && "TAG_NAME",
    !CDK_DEFAULT_ACCOUNT && "CDK_DEFAULT_ACCOUNT",
    !CDK_DEFAULT_REGION && "CDK_DEFAULT_REGION",
  ].filter((v): v is string => Boolean(v));
  throw new Error(`未設定の環境変数: ${missing.join(", ")}`);
}

cdk.Tags.of(app).add(TAG_KEY, TAG_NAME);

const env = {
  account: CDK_DEFAULT_ACCOUNT,
  region: CDK_DEFAULT_REGION,
};

new MidoriGuardianStack(app, "MidoriGuardianStack", { env });

new IotStack(app, "IotStack", { env });
