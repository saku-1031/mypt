# 🧠 Mypato — Voice MCP MVP

**Version:** 0.1
**Author:** SakuSaku
**Concept:** “耳の中の相棒AI” — 声だけでメモ・予定・音楽を操作するパーソナルAI。

---

## 🎯 プロジェクト概要

Mypatoは、音声入力を起点に

> **音声 → ASR → LLM（理解＋ツール決定） → MCPツール実行 → 音声出力**

の流れを1ターンで完結させる、**音声版MCP（Model Context Protocol）**の最小実装です。
Dockerを使わず、TypeScript＋Swift（iOS）で動くMVP構成。

### ✅ できること（MVP）

* 「メモして〜」 → Obsidian/Notesに保存
* 「明日10時に予定入れて」 → カレンダー登録
* 「音楽止めて」 → Spotify / Apple Music 操作
* 「今出れば間に合う？」 → 地図＋予定からETA判定（裏側固定API）
* すべて音声で完結（ASR〜TTS）

---

## 🧩 技術スタック

| 層          | 技術                                  | 役割                                   |
| ---------- | ----------------------------------- | ------------------------------------ |
| **LLM層**   | OpenAI GPT-4o / GPT-4o-mini         | 意図抽出＋ツール決定＋要約                        |
| **ASR**    | Google Cloud Speech-to-Text (Chirp) | 音声→テキスト変換（98%精度・話者分離対応）             |
| **TTS**    | OpenAI TTS API（またはPiper）            | テキスト→音声生成                            |
| **MCPツール** | memo / calendar / music（独自実装）       | 外部アプリ操作（将来拡張）                        |
| **Web**    | Next.js（apps/web）                   | 設定UI・ログ確認                            |
| **iOS**    | Swift (AVAudio / Notification)      | 録音→送信→再生・トリガ制御                       |
| **サーバ**    | Node.js 20 / TypeScript             | `/asr`, `/agent`, `/tts` API・MCP Hub |

---

## 📁 ディレクトリ構成

```
repo/
├─ apps/
│  ├─ web/            # Next.js UI（設定・ログ）
│  └─ ios/            # Swift（AirPods/録音・再生）
│
├─ services/
│  ├─ agent/          # LLM/ASR/TTSサーバ
│  │  └─ src/
│  │     ├─ llm/
│  │     │  ├─ openai.ts          # OpenAIクライアント
│  │     │  └─ prompts/system.md  # system prompt（方針）
│  │     └─ route/
│  │        ├─ asr.ts             # 音声→テキスト
│  │        ├─ agent.ts           # テキスト→LLM＋ツール実行
│  │        └─ tts.ts             # テキスト→音声
│  │
│  └─ mcp-hub/        # 音声テキスト→Intent→複数MCPチェーン
│     └─ src/...      # Router / Plan / Executor / Logger etc.
│
├─ mcps/              # 各ツール（memo/calendar/music）
├─ packages/          # 共通Zodスキーマ・ユーティリティ
├─ vault/             # Obsidian互換データ
│  ├─ Inbox/
│  ├─ events/
│  └─ memory/
└─ pnpm-workspace.yaml
```

---

## 🚀 セットアップ手順（Docker不要）

### 1. 環境準備

```bash
pnpm install
cp .env.example .env
```

`.env` の例：

```bash
# OpenAI API Configuration (TTS)
OPENAI_API_KEY=sk-xxxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_CHAT=gpt-4o-mini
OPENAI_MODEL_TTS=gpt-4o-mini-tts

# Google Cloud Speech-to-Text Configuration (ASR)
# サービスアカウントキーファイルのパスを指定
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
# プロジェクトID（オプション）
GOOGLE_CLOUD_PROJECT=your-project-id
```

### Google Cloud認証設定

#### 方法1: サービスアカウントキー（ローカル開発推奨）

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Speech-to-Text API を有効化
3. サービスアカウントを作成してJSONキーをダウンロード
4. `.env` に `GOOGLE_APPLICATION_CREDENTIALS` でキーファイルのパスを指定

```bash
GOOGLE_APPLICATION_CREDENTIALS=/Users/you/mypt/keys/gcp-service-account.json
```

#### 方法2: Workload Identity（本番環境）

Google Cloud Run や GKE で実行する場合は、Workload Identity を使用すれば環境変数不要で自動認証されます。

### 2. ローカル起動（Node）

```bash
cd services/agent
pnpm dev   # 任意のHTTPサーバで asr/agent/tts を公開
```

### 3. 動作確認

```bash
curl -X POST http://localhost:3000/asr \
  -H "x-api-key: test" \
  -H "Content-Type: audio/m4a" \
  --data-binary "@voice.m4a"
```

→ `{ "text": "明日10時にMypato仕様見直し入れて" }`

```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"text": "明日10時にMypato仕様見直し入れて"}'
```

→ `{ "speak": "明日10時に予定を入れました。", "note": "..." }`

---

## 🪄 ファイル役割一覧

| ファイル        | 役割                                       |
| ----------- | ---------------------------------------- |
| `openai.ts` | Whisper/Chat/TTS すべてを統合したクライアント          |
| `system.md` | LLMの人格・出力スキーマを定義するsystem prompt          |
| `asr.ts`    | 音声データを受け取り→Whisperで文字起こし                 |
| `agent.ts`  | テキストをLLMへ渡し→actions/results/speak/note返却 |
| `tts.ts`    | テキストを音声化して返す（`audio/mpeg`）               |

---

## 🧭 実装順序（開発フロー）

| Day | やること                                     |
| --- | ---------------------------------------- |
| 1   | `/asr` `/agent` `/tts` ハンドラを完成（テキスト往復確認） |
| 2   | MCP Hubの最小版（memo/calendar/music）を接続      |
| 3   | iOSから音声送信→再生まで通す                         |
| 4   | Web UIでデフォルトアプリ設定フォーム実装                  |
| 5   | `vault/events/` ログ確認＋Obsidian同期テスト       |

---

## ⚙️ 設計の考え方

### ● 開発スタイル

* “**理解しながら進める**”が前提 → AIはペアプロ兼レビュア
* 1PR = 1目的、30行単位でコミット
* TypeScriptで型を壊さず進める（Zodバリデーション必須）

### ● MCP哲学

* MCP（Model Context Protocol）は「AIと外部アプリの共通I/F」。
  このプロジェクトでは「音声入力でもそれを自然に使える」ことを目指す。
  → 音声からIntentを抽出し、`memo.create`や`calendar.add`など**ツール呼び出しを自動決定**。

### ● 速度より理解

* リアルタイム性（<700ms）は追わず、まず**正確な理解→実行**を優先。
  “耳元の相棒”をつくるフェーズでは**会話品質＞反応速度**。

---

## 🧱 今後の拡張ロードマップ

| バージョン    | 追加機能                  | 概要                         |
| -------- | --------------------- | -------------------------- |
| **v0.2** | 複数MCPチェーン             | 「予定入れて→メモして」を一文で処理         |
| **v0.3** | 擬似24h運用               | 通知・時間・位置トリガによる起動           |
| **v0.4** | 相棒人格化                 | 声・口調・XP/Bondの成長要素          |
| **v0.5** | Realtime化             | ASR/TTSだけストリーム化（Pipecat対応） |
| **v1.0** | 独自ボイス / マルチプラットフォーム展開 | オリジナル音声合成＋Android/Web対応    |

---

## 🧩 外部サービス連携（予定）

| 種類    | 連携対象                            | 用途             |
| ----- | ------------------------------- | -------------- |
| メモ    | Apple Notes / Notion / Obsidian | 音声メモ・思考ログ      |
| カレンダー | Google / Apple                  | スケジュール管理       |
| 音楽    | Spotify / Apple Music           | 再生・制御          |
| 通信    | LINE / iMessage                 | 簡単な送受信（v0.3以降） |

---

## 📜 ログ仕様

* ローカル保存: `vault/events/YYYY-MM-DD.jsonl`
* フォーマット:

  ```json
  {
    "ts": "2025-10-23T10:05:12+09:00",
    "type": "nlu.intent",
    "name": "calendar.add",
    "entities": {"title": "Mypato仕様見直し", "datetime": "2025-10-24T10:00:00+09:00"},
    "ok": true
  }
  ```

---

## 💡 開発Tips

* **/asr** → 音声ファイルは m4a 推奨。
* **/agent** → テキストは最大 2000 字まで。
* **/tts** → 出力音声は `audio/mpeg`、クライアントで `<audio>` 再生可能。
* **iOS側** → 録音開始から終了までを 15 秒以内に制限。

---

## 🧩 FAQ

**Q. Dockerなしでも動く？**
→ はい。Node + OpenAI API だけで全機能が動作します。WhisperやTTSをローカル化したいときだけDockerを検討。

**Q. どこまで無料で動く？**
→ Whisper + GPT-4o-mini + TTS で、1リクエストあたり数円以下。月数百円〜千円程度。

**Q. リアルタイムにする予定は？**
→ v0.5でPipecatやOpenAI Realtime APIを導入予定。

---

## 🧾 ライセンス・注意事項

* © 2025 SakuSaku
* 個人開発・教育目的での使用自由。
* APIキーや個人情報を含むVaultデータは**クラウドに同期しない**ことを推奨。
* 将来的に音声・行動ログの扱いにはプライバシーポリシーを明記予定。

---

## 🪜 最後に

> Mypatoは「技術理解 × 行動体験 × 相棒性」の三本柱で作る“耳の中の友達”。
> まずは1ターンでも「話して→動いた→返ってきた！」を感じてください。
> その1往復が、AI時代のUXの起点になります。
