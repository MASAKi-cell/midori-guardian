# 実装計画書 — Step 1: AWS IoT Core & IotStack 構築

## 目的

AWS IoT Core の基盤リソース（Thing・Policy）を `IotStack` として CDK 化し、最小権限 IoT ポリシーを定義する。
証明書はプライベートキーが CDK/CloudFormation から取得不可のため、CDK デプロイ後に CLI で手動発行する運用とする。

---

## 変更ファイル一覧

| 操作     | ファイル                 |
| -------- | ------------------------ |
| 新規作成 | `lib/iot-stack.ts`       |
| 変更     | `bin/midori-guardian.ts` |
| 新規作成 | `test/iot-stack.test.ts` |

---

## 実装ステップ

1. **`lib/iot-stack.ts` を作成**

   - `CfnThing`: Thing 名 `midori-pi-001`
   - `CfnPolicy`: 最小権限ポリシー（Connect / Publish / Subscribe / Receive を特定トピックのみに限定）
   - `CfnOutput`: Thing 名・Policy ARN・証明書発行コマンドを出力

2. **`bin/midori-guardian.ts` を更新**

   - `IotStack` を追加インスタンス化
   - `env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-northeast-1' }` を設定（アカウント ID はハードコードしない）

3. **`test/iot-stack.test.ts` を作成**
   - IoT Thing が `midori-pi-001` で存在すること
   - IoT Policy がワイルドカード（`iot:*` / `*`）を含まないこと

---

## IoT リソース設計

| リソース           | 値                   |
| ------------------ | -------------------- |
| Thing 名           | `midori-pi-001`      |
| MQTT トピック      | `midori/sensor/data` |
| IoT Policy 名      | `MidoriPiPolicy`     |
| デプロイリージョン | `ap-northeast-1`     |
| AWS プロファイル   | `company-dev`        |

### IoT Policy（最小権限）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:<region>:<account>:client/midori-pi-001"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": "arn:aws:iot:<region>:<account>:topic/midori/sensor/data"
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Subscribe", "iot:Receive"],
      "Resource": "arn:aws:iot:<region>:<account>:topicfilter/midori/sensor/data"
    }
  ]
}
```

---

## 証明書の扱い（CDK 外の手動ステップ）

CDK デプロイ後に以下の CLI コマンドで証明書・キーを発行し、Pi に手動配置する。

```bash
aws iot create-keys-and-certificate \
  --set-as-active \
  --profile company-dev \
  --region ap-northeast-1
```

証明書ファイルは Pi のローカルファイルシステムに配置し、リポジトリには含めない（CLAUDE.me シークレット管理方針に従う）。

---

## ロールバック方針

- デプロイ前: `git revert` のみで戻る
- デプロイ後: `cdk destroy IotStack --profile company-dev` で Thing・Policy を削除
- 証明書が発行済みの場合: `aws iot delete-certificate --certificate-id <id> --profile company-dev` を別途実施
