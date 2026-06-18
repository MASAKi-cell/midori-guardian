#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { MidoriGuardianStack } from "../lib/midori-guardian-stack";
import { IotStack } from "../lib/iot-stack";

const app = new cdk.App();

new MidoriGuardianStack(app, "MidoriGuardianStack");

new IotStack(app, "IotStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-northeast-1",
  },
});
