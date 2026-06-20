import * as iam from "aws-cdk-lib/aws-iam";
import * as iot from "aws-cdk-lib/aws-iot";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";

const THING_NAME = "midori-pi-001";
const TOPIC = "midori/sensor/data";
const POLICY_NAME = "MidoriPiPolicy";
const ROLE_ALIAS_NAME = "MidoriPiRoleAlias";
const SECRET_NAME = "iot/midori-pi-001/certificate";

export class IotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new iot.CfnThing(this, "MidoriPiThing", {
      thingName: THING_NAME,
    });

    const secret = new secretsmanager.Secret(this, "MidoriPiCertSecret", {
      secretName: SECRET_NAME,
      description: `IoT certificate and private key for ${THING_NAME}`,
    });

    const iotRole = new iam.Role(this, "MidoriPiIotRole", {
      roleName: "MidoriPiIotRole",
      assumedBy: new iam.ServicePrincipal("credentials.iot.amazonaws.com"),
    });

    secret.grantRead(iotRole);

    new iot.CfnRoleAlias(this, "MidoriPiRoleAlias", {
      roleAlias: ROLE_ALIAS_NAME,
      roleArn: iotRole.roleArn,
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
          {
            Effect: "Allow",
            Action: "iot:AssumeRoleWithCertificate",
            Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rolealias/${ROLE_ALIAS_NAME}`,
          },
        ],
      },
    });

    new cdk.CfnOutput(this, "ThingName", { value: THING_NAME });
    new cdk.CfnOutput(this, "PolicyName", { value: POLICY_NAME });
    new cdk.CfnOutput(this, "RoleAliasName", { value: ROLE_ALIAS_NAME });
    new cdk.CfnOutput(this, "SecretName", { value: SECRET_NAME });
  }
}
