import * as iot from "aws-cdk-lib/aws-iot";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";

const THING_NAME = "midori-pi-001";
const TOPIC = "midori/sensor/data";
const POLICY_NAME = "MidoriPiPolicy";

export class IotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new iot.CfnThing(this, "MidoriPiThing", {
      thingName: THING_NAME,
    });

    new iot.CfnPolicy(this, "MidoriPiPolicy", {
      policyName: POLICY_NAME,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "iot:Connect",
            Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:client/${THING_NAME}`,
          },
          {
            Effect: "Allow",
            Action: "iot:Publish",
            Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topic/${TOPIC}`,
          },
          {
            Effect: "Allow",
            Action: ["iot:Subscribe", "iot:Receive"],
            Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topicfilter/${TOPIC}`,
          },
        ],
      },
    });

    new cdk.CfnOutput(this, "ThingName", { value: THING_NAME });
    new cdk.CfnOutput(this, "PolicyName", { value: POLICY_NAME });
  }
}
