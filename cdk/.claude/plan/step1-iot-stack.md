# 実装計画書 — Step 1: AWS IoT Core & IotStack 構築

## 目的

AWS IoT Core の基盤リソース（Thing・Policy・Role Alias）と Secrets Manager シークレットを `IotStack` として CDK 化する。証明書はプライベートキーが CDK/CloudFormation から取得不可のため、CDK デプロイ後に CLI で手動発行する。
発行した証明書・秘密鍵は Secrets Manager に格納し、Pi は IoT 認証情報プロバイダー経由で取得した一時 IAM 認証情報を使って参照できるようにする。

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
   - `CfnPolicy`: 最小権限ポリシー（Connect / Publish / Subscribe / Receive / AssumeRoleWithCertificate）
   - `Secret`: `iot/midori-pi-001/certificate`（プレースホルダーとして作成）
   - `Role`: `MidoriPiIotRole`（上記シークレット読み取りのみ）
   - `CfnRoleAlias`: `MidoriPiRoleAlias`（上記 IAM Role を参照）
   - `CfnOutput`: Thing 名・Policy ARN・Role Alias・証明書発行コマンドを出力

2. **`bin/midori-guardian.ts` を更新**

   - `IotStack` を追加インスタンス化
   - `env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-northeast-1' }` を設定（アカウント ID はハードコードしない）

3. **`test/iot-stack.test.ts` を作成**
   - IoT Thing が `midori-pi-001` で存在すること
   - IoT Policy がワイルドカード（`iot:*` / `*`）を含まないこと
   - IAM Role が対象シークレットのみ読み取り可能なこと

---

## IoT リソース設計

| リソース           | 値                              |
| ------------------ | ------------------------------- |
| Thing 名           | `midori-pi-001`                 |
| MQTT トピック      | `midori/sensor/data`            |
| IoT Policy 名      | `MidoriPiPolicy`                |
| IoT Role Alias     | `MidoriPiRoleAlias`             |
| IAM Role 名        | `MidoriPiIotRole`               |
| SM シークレット名  | `iot/midori-pi-001/certificate` |
| デプロイリージョン | `ap-northeast-1`                |
| AWS プロファイル   | `company-dev`                   |

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
    },
    {
      "Effect": "Allow",
      "Action": "iot:AssumeRoleWithCertificate",
      "Resource": "arn:aws:iot:<region>:<account>:rolealias/MidoriPiRoleAlias"
    }
  ]
}
```

---

## 証明書の扱いと Pi 起動フロー

### 初回セットアップ（手動）

CDK デプロイ後に以下の手順を実施する。

```bash
# 1. 証明書・キーを発行
aws iot create-keys-and-certificate \
  --set-as-active \
  --profile company-dev \
  --region ap-northeast-1 > cert-output.json

# 2. Secrets Manager に格納
aws secretsmanager put-secret-value \
  --secret-id "iot/midori-pi-001/certificate" \
  --secret-string file://cert-output.json \
  --profile company-dev \
  --region ap-northeast-1

# 3. Thing・Policy に証明書をアタッチ
CERT_ARN=$(cat cert-output.json | jq -r '.certificateArn')
aws iot attach-thing-principal --thing-name midori-pi-001 --principal $CERT_ARN \
  --profile company-dev --region ap-northeast-1
aws iot attach-policy --policy-name MidoriPiPolicy --target $CERT_ARN \
  --profile company-dev --region ap-northeast-1

# 4. 証明書ファイルを Pi に転送（初回のみ）
scp cert-output.json pi@<Pi-IP>:~/certs/
```

### Pi 起動時フロー

```
Pi 起動
  │
  ├─ 1. ローカルの証明書・秘密鍵で IoT 認証情報エンドポイントを呼び出す
  │      GET https://<cred-endpoint>/role-aliases/MidoriPiRoleAlias/credentials
  │
  ├─ 2. 一時 IAM 認証情報を取得
  │
  ├─ 3. 一時認証情報で Secrets Manager からシークレットを取得
  │      aws secretsmanager get-secret-value --secret-id iot/midori-pi-001/certificate
  │
  └─ 4. MQTT 接続 → midori/sensor/data にデータ送信
```

---

## ロールバック方針

- デプロイ前: `git revert` のみで戻る
- デプロイ後: `cdk destroy IotStack --profile company-dev` で Thing・Policy・Secret・Role を削除
- 証明書が発行済みの場合: `aws iot delete-certificate --certificate-id <id> --profile company-dev` を別途実施
