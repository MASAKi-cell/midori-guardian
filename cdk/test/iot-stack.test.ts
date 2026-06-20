import { Template } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib/core";
import { IotStack } from "../lib/iot-stack";

let template: Template;

beforeAll(() => {
  const app = new cdk.App();
  const stack = new IotStack(app, "TestIotStack");
  template = Template.fromStack(stack);
});

test("IoT Thing is created with correct name", () => {
  template.hasResourceProperties("AWS::IoT::Thing", {
    ThingName: "midori-pi-001",
  });
});

test("IoT Policy does not use wildcard actions", () => {
  const policies = template.findResources("AWS::IoT::Policy");
  for (const policy of Object.values(policies)) {
    const statements = (policy as any).Properties.PolicyDocument.Statement;
    for (const statement of statements) {
      const actions: string[] = Array.isArray(statement.Action)
        ? statement.Action
        : [statement.Action];
      expect(actions).not.toContain("iot:*");
      expect(actions).not.toContain("*");
    }
  }
});

test("IoT Policy does not use wildcard resources", () => {
  const policies = template.findResources("AWS::IoT::Policy");
  for (const policy of Object.values(policies)) {
    const statements = (policy as any).Properties.PolicyDocument.Statement;
    for (const statement of statements) {
      const resources: unknown[] = Array.isArray(statement.Resource)
        ? statement.Resource
        : [statement.Resource];
      for (const resource of resources) {
        expect(resource).not.toBe("*");
      }
    }
  }
});

test("Secrets Manager secret is created with correct name", () => {
  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: "iot/midori-pi-001/certificate",
  });
});

test("IAM Role trusts IoT credentials service", () => {
  template.hasResourceProperties("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "credentials.iot.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    },
  });
});

test("IAM Role does not have wildcard resource on SecretsManager actions", () => {
  const policies = template.findResources("AWS::IAM::Policy");
  for (const policy of Object.values(policies)) {
    const statements = (policy as any).Properties.PolicyDocument.Statement;
    for (const statement of statements) {
      const actions: string[] = Array.isArray(statement.Action)
        ? statement.Action
        : [statement.Action];
      const isSecretsManager = actions.some((a) =>
        a.startsWith("secretsmanager:"),
      );
      if (isSecretsManager) {
        const resources: unknown[] = Array.isArray(statement.Resource)
          ? statement.Resource
          : [statement.Resource];
        expect(resources).not.toContain("*");
      }
    }
  }
});

test("IoT Role Alias is created", () => {
  template.hasResourceProperties("AWS::IoT::RoleAlias", {
    RoleAlias: "MidoriPiRoleAlias",
  });
});
