# Google Cloud Speech-to-Text セットアップガイド

このドキュメントでは、MypatoでGoogle Cloud Speech-to-Text APIを使用するための設定手順を説明します。

## 📋 前提条件

- Googleアカウント
- クレジットカード（無料枠あり：月60分 + 新規$300クレジット）

---

## 🚀 セットアップ手順

### 1. Google Cloud Console にアクセス

https://console.cloud.google.com/

### 2. プロジェクトを作成

1. 左上の「プロジェクトを選択」をクリック
2. 「新しいプロジェクト」を選択
3. プロジェクト名を入力（例: `mypato-voice`）
4. 「作成」をクリック

### 3. Speech-to-Text API を有効化

#### 方法A: 検索から有効化
1. 上部の検索バーで「Speech-to-Text API」と入力
2. 「Cloud Speech-to-Text API」を選択
3. 「有効にする」をクリック

#### 方法B: 直接リンク
https://console.cloud.google.com/apis/library/speech.googleapis.com

### 4. サービスアカウントを作成

1. 左メニューから「IAM と管理」→「サービス アカウント」を選択
   - 直接リンク: https://console.cloud.google.com/iam-admin/serviceaccounts
2. 上部の「サービス アカウントを作成」をクリック

#### 4-1. サービスアカウントの詳細
- **名前**: `mypato-speech`（任意の名前）
- **説明**: `Mypato音声文字起こし用`（任意）
- 「作成して続行」をクリック

#### 4-2. ロールの付与
「ロールを選択」ドロップダウンから以下のいずれかを選択：
- **推奨**: `Cloud Speech Client` （読み取り専用、セキュア）
- **開発用**: `Cloud Speech 管理者`（フル権限）

「続行」→「完了」をクリック

### 5. JSONキーをダウンロード

1. 作成したサービスアカウント（`mypato-speech@...`）をクリック
2. 上部タブの「キー」を選択
3. 「鍵を追加」→「新しい鍵を作成」をクリック
4. キーのタイプ: **JSON** を選択
5. 「作成」をクリック
6. JSONファイルが自動的にダウンロードされます

---

## 🔧 ローカル環境の設定

### 1. キーファイルを安全な場所に配置

```bash
# プロジェクトルートに keys ディレクトリを作成
cd /Users/saku/mypt
mkdir -p keys

# ダウンロードしたJSONファイルを移動（ファイル名は適宜変更）
mv ~/Downloads/mypato-voice-xxxxx.json keys/gcp-service-account.json
```

### 2. パーミッションを設定（推奨）

```bash
# キーファイルを読み取り専用に設定
chmod 400 keys/gcp-service-account.json
```

### 3. .env ファイルに追加

#### プロジェクトルートの .env
```bash
# /Users/saku/mypt/.env
GOOGLE_APPLICATION_CREDENTIALS=/Users/saku/mypt/keys/gcp-service-account.json
```

#### Webアプリの .env
```bash
# /Users/saku/mypt/apps/web/.env
GOOGLE_APPLICATION_CREDENTIALS=/Users/saku/mypt/keys/gcp-service-account.json
```

### 4. .gitignore の確認

`keys/` ディレクトリが `.gitignore` に含まれていることを確認してください：

```bash
# .gitignore
keys/
*.json
```

---

## ✅ 動作確認

### テストスクリプト（オプション）

```bash
node -e "
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();
console.log('✅ Google Cloud Speech client initialized successfully');
"
```

### Webアプリで確認

1. 開発サーバーを起動
```bash
cd apps/web
pnpm dev
```

2. http://localhost:3000 にアクセス
3. 「文字起こし (ASR)」タブを選択
4. 音声ファイルをアップロードまたはマイクで録音
5. ログに `confidence: XX.X%` が表示されれば成功

---

## 🔐 セキュリティのベストプラクティス

### ✅ すべきこと
- ✅ サービスアカウントキーは `.gitignore` に追加
- ✅ キーファイルのパーミッションを `400` に設定
- ✅ 本番環境では Workload Identity を使用
- ✅ 定期的にキーをローテーション

### ❌ してはいけないこと
- ❌ JSONキーをGitリポジトリにコミット
- ❌ JSONキーを公開チャンネルで共有
- ❌ 管理者権限のサービスアカウントを本番環境で使用
- ❌ ハードコードでキーを埋め込む

---

## 💰 料金について

### 無料枠
- **月60分**の文字起こしが無料
- 新規ユーザーには **$300のクレジット**（90日間有効）

### 従量課金（無料枠超過後）
| タイプ | 料金 |
|--------|------|
| 標準（リアルタイム） | $0.016/分 |
| Dynamic Batch（24h遅延OK） | $0.004/分 |
| ボリューム割引 | 大量利用で最大 $0.004/分 |

### 現在のWhisperとの比較
| サービス | 料金 | 備考 |
|----------|------|------|
| OpenAI Whisper | $0.006/分 | フラット料金 |
| Google STT（標準） | $0.016/分 | 無料枠あり |
| Google STT（ボリューム） | $0.004/分 | 大量利用時 |

**結論**: 小規模ならWhisperが安く、大規模ならGoogle STTのボリューム割引が有利

---

## 🛠️ トラブルシューティング

### エラー: "GOOGLE_APPLICATION_CREDENTIALS is not set"
→ `.env` ファイルに正しいパスが設定されているか確認
```bash
echo $GOOGLE_APPLICATION_CREDENTIALS
```

### エラー: "Permission denied"
→ サービスアカウントに適切なロールが付与されているか確認
- IAM Console: https://console.cloud.google.com/iam-admin/iam

### エラー: "API not enabled"
→ Speech-to-Text APIが有効化されているか確認
- API Console: https://console.cloud.google.com/apis/dashboard

### エラー: "Invalid JSON key file"
→ ダウンロードしたJSONファイルが破損していないか確認
```bash
cat keys/gcp-service-account.json | jq .
```

---

## 📚 参考リンク

- [Google Cloud Speech-to-Text 公式ドキュメント](https://cloud.google.com/speech-to-text/docs)
- [Chirp 3 モデル](https://cloud.google.com/speech-to-text/v2/docs/chirp_3-model)
- [Node.js クライアントライブラリ](https://cloud.google.com/speech-to-text/docs/libraries#client-libraries-install-nodejs)
- [料金詳細](https://cloud.google.com/speech-to-text/pricing)

---

## 🎯 次のステップ

1. ✅ Google Cloud プロジェクト作成
2. ✅ Speech-to-Text API 有効化
3. ✅ サービスアカウント作成
4. ✅ JSONキーダウンロード
5. ✅ 環境変数設定
6. 🔄 Webアプリでテスト
7. 🚀 本番環境デプロイ（Workload Identity推奨）
