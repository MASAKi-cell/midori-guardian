#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { IotStack } from "../lib/iot-stack";
import { MidoriGuardianStack } from "../lib/midori-guardian-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new MidoriGuardianStack(app, "MidoriGuardianStack", { env });

new IotStack(app, "IotStack", { env });
