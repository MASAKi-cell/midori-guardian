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
