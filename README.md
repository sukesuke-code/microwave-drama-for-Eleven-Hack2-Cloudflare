# Microwave Show

> **As of April 5, 2026**, this repository is a React + Cloudflare Worker app that turns microwave waiting time into a short, dramatic narration experience with generated voice/SFX/music.

---

## English

### 1) What this app is (current implementation)

Microwave Show is an entertainment web app with a 4-screen flow:
1. Landing (`TopPage`)
2. Input/settings (`SettingsPage`)
3. Live countdown with narration/audio effects (`CountdownPage`)
4. Result/share (`ResultPage`)

It supports Japanese/English UI and dark/light themes.

### 2) Stack and architecture (fact-based)

#### Frontend
- React + TypeScript + Vite
- Tailwind CSS for styling
- Main app state is local (`useState`) plus browser storage (`localStorage`, `sessionStorage`)

#### Backend (edge)
- Cloudflare Worker (`worker/src/index.ts`) with REST endpoints:
  - `POST /api/agent/narration`
  - `POST /api/tts`
  - `POST /api/generate-sfx`
  - `POST /api/generate-music`
  - mock session endpoints for `/api/session/*`

#### AI/voice providers used
- Narration text generation: Gemini API (if key exists) then Workers AI fallback
- Voice and sound generation: ElevenLabs APIs

### 3) Cloudflare × ElevenLabs hackathon fit

Prompt requirement summary:
- Build something creative using Cloudflare platform + ElevenLabs
- Emphasize Workers, Durable Objects, scalable AI agents, and viral demo quality

How this repo fits **today**:
- ✅ Creative consumer-facing concept and UI polish
- ✅ Uses Cloudflare Worker as backend entrypoint
- ✅ Uses ElevenLabs voice/sound APIs
- ⚠️ Durable Objects are not currently wired into active routing in `worker/src/index.ts` (a DO class file exists but is not bound/used in the running API path)
- ⚠️ Cloudflare Agents-specific platform features (durable execution orchestration, browser rendering, vector memory workflows) are not fully implemented

### 4) Product analysis

#### Functional value
- Converts idle microwave time into playful voice-first entertainment
- Strong short-session engagement loop (set time → experience → share/replay)

#### Demand hypothesis
- Best fit: casual social sharing, novelty UX, short-form content creators
- Weak fit: utility-first users who only want a plain timer

#### Competition landscape (inference)
- Adjacent alternatives: timer apps, novelty voice generators, meme apps
- Direct competitors with same niche concept are likely limited, but low entry barriers mean imitators are easy

#### Differentiation opportunities
- Session persistence and synchronized multi-device “watch party” mode
- More style packs and creator voices
- One-click auto video export for social posting
- Personalized narrator identity over repeated sessions

#### Moat assessment (current)
- **Weak moat now**: concept is creative but replicable
- Potential moat sources:
  - proprietary prompt/audio timing orchestration quality
  - viral content loop + community templates
  - historical user taste profiles for “best narration style” personalization

#### Monetization options
- Freemium: free base styles, paid premium voices/themes
- Credits: pay-per-premium render/audio bundle
- B2B brand collab: themed seasonal narration packs
- UGC affiliate loop: branded share templates

### 5) UI/UX evaluation (strict)

#### What is strong
- Clear 1-primary-action screens and progressive flow
- Immediate visual identity (neon/hero treatment)
- Bilingual support and theme toggling on key screens
- Time presets reduce input friction

#### What harms “simple & intuitive”
- Visual density is intentionally high; this can overwhelm first-time users
- Style card count is high for a short interaction and may increase decision time
- Multiple simultaneous effects (narration + music + sfx + flashes) can feel noisy on low-end devices

#### Practical UX improvements (without redesigning concept)
- Add “Quick Start (60s + default style)” shortcut
- Add “Reduced Effects” accessibility toggle
- Keep selected style/time visible as persistent compact summary during countdown
- Add explicit loading stages (“Generating narration”, “Generating voice”) for trust

### 6) Code review (high-priority findings)

#### Security / privacy
- Secrets are server-side only (good), but CORS is wildcard `*` on all API routes (risk for abuse)
- No robust per-user auth/rate-limiting at Worker level in current code
- Frontend fallback allows `VITE_ELEVENLABS_AGENT_ID` usage; operationally convenient but must avoid exposing privileged identifiers/settings

#### Reliability
- Frontend expects richer session APIs; Worker currently provides simplified/mock session responses for `/api/session/*`
- Partial mismatch risk between expected session lifecycle and Worker implementation

#### Performance
- Good: lazy-loaded pages and idle prefetch in `App.tsx`
- Risk: repeated audio generation calls during phase transitions can add latency and provider cost spikes

#### Maintainability
- Frontend API client is large and multi-responsibility; recommend module split (session, narration, audio, transport)
- Worker has mixed concerns in one file (routing + provider adapters + prompting)

### 7) Legal/commercial/copyright check (non-lawyer assessment)

- **No obvious embedded third-party copyrighted media files** were found in this repo.
- Dependencies include OSS packages with their own licenses; commercial use requires preserving license obligations.
- AI-generated voice/audio output can still create legal risk depending on prompts, model terms, and jurisdiction.
- ElevenLabs and model provider ToS/policy compliance is essential for commercial launch.
- If voice cloning or celebrity-like style is introduced later, consent/right-of-publicity checks become critical.

> This is a technical risk review, not legal advice. For launch decisions, confirm with counsel.

### 8) Security visibility question: “Can external users see README/backend code?”

- If this GitHub repository is public, `README.md` and backend source under `worker/` are visible by design.
- Current Worker API endpoints are internet-accessible once deployed unless you add auth/network restrictions.
- The **secret values themselves** are not in source and should remain hidden via Wrangler Secrets.

### 9) Accurate setup (complete and current)

#### Prerequisites
- Node.js 18+
- npm
- Cloudflare account and Wrangler CLI login
- ElevenLabs API key

#### 9.1 Frontend setup
```bash
npm install
cp .env.example .env
```

Edit `.env`:
```dotenv
VITE_API_BASE=http://localhost:8787
VITE_API_SESSION_START_PATH=/api/session/start
VITE_ELEVENLABS_AGENT_ID=
```

Run:
```bash
npm run dev
```

#### 9.2 Worker setup
```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ELEVENLABS_API_KEY
# optional
npx wrangler secret put GEMINI_API_KEY
npx wrangler dev
```

### 10) Migration/disaster-recovery note

This repo currently has only a minimal Durable Object migration section in `worker/wrangler.toml`, and active runtime routes do not fully depend on Durable Objects.
If you need one-command environment recovery, add:
- explicit schema/state version file,
- migration script pipeline,
- smoke test that verifies all required endpoints post-restore.

---

## 日本語

### 1) このアプリの実態（現行コード基準）

Microwave Show は、電子レンジ待ち時間を“実況エンタメ化”する Web アプリです。画面フローは以下の4段階です。
1. ランディング (`TopPage`)
2. 設定入力 (`SettingsPage`)
3. カウントダウン実況 (`CountdownPage`)
4. 結果・共有 (`ResultPage`)

日本語/英語 UI とダーク/ライトテーマに対応しています。

### 2) 技術構成（事実ベース）

#### フロントエンド
- React + TypeScript + Vite
- Tailwind CSS
- 主要状態管理は `useState` とブラウザストレージ

#### バックエンド（エッジ）
- Cloudflare Worker (`worker/src/index.ts`) の REST API
  - `POST /api/agent/narration`
  - `POST /api/tts`
  - `POST /api/generate-sfx`
  - `POST /api/generate-music`
  - `/api/session/*` は簡易モック応答

#### AI/音声
- ナレーション文生成: Gemini（キーがある場合）→ Workers AI フォールバック
- 音声・効果音・音楽: ElevenLabs API

### 3) Hackathon 条件との整合性

現状の適合:
- ✅ Cloudflare Worker + ElevenLabs を使った創造的アプリ
- ✅ 体験価値は高く、動画映えしやすい
- ⚠️ Durable Objects はコードファイルはあるが、現行 API ルーティングで本格活用されていない
- ⚠️ Cloudflare Agents 系の耐久実行/高度オーケストレーションは未実装領域がある

### 4) 機能・需要・競合・差別化・Moat・収益化

#### 機能価値
- “待ち時間の退屈”を“短時間の没入体験”に変換
- 1セッションが短く、共有導線と相性が良い

#### 需要仮説
- 強い: SNSで遊ぶ層、ショート動画制作者
- 弱い: 実用タイマーのみ求める層

#### 競合（推論）
- タイマーアプリ、音声遊び系アプリ、ミーム系体験が隣接競合
- 同コンセプトの直競合は多くない可能性がある一方、模倣コストは低い

#### 差別化案
- 複数端末同期の同時観戦モード
- 音声スタイルの拡張・パーソナライズ
- SNS向け動画自動書き出し
- リピートで育つ“あなた専用実況者”体験

#### Moat評価
- **現状Moatは弱め**（アイデア自体は再現されやすい）
- 強化要素:
  - 音声タイミング制御品質
  - 投稿テンプレートとUGCループ
  - 履歴学習ベースの最適スタイル提示

#### 収益化
- フリーミアム（標準無料 + 高品質音声/テーマ課金）
- クレジット制（プレミアム音声生成ごと課金）
- 企業タイアップ（季節・商品連動テーマ）

### 5) UI/UX 徹底分析（厳しめ）

#### 良い点
- 1画面1目的で導線が明快
- 開始までの操作が短い
- プリセット時間が直感的
- 言語切替・テーマ切替が分かりやすい

#### 直感性を下げる点
- ビジュアル演出が濃く、初見では情報密度が高い
- スタイル選択肢が多く、迷いやすい
- 音声・BGM・SE・フラッシュ同時演出は端末性能により体感が荒れる

#### 改善提案（世界観維持前提）
- 「クイック開始（60秒固定）」ボタン追加
- 「演出軽量モード」追加
- カウントダウン中に選択中スタイル/料理名を固定表示
- 生成中ステップ表示で待ち不安を下げる

### 6) コードレビュー（重要指摘）

#### セキュリティ
- 秘密鍵をコードに直書きしていない点は良い
- ただし CORS が `*` で全開放のため、濫用対策は要強化
- Worker 側で利用者単位の認証/レート制御が不足

#### 信頼性
- フロントが期待するセッション運用に対し、Worker の `/api/session/*` は現状モック寄り
- セッション整合性で将来的な不具合余地あり

#### 性能
- ページ遅延ロード・アイドル時プリロードは良い
- フェーズごとの音声生成頻度が高いとAPI遅延とコスト増に直結

#### 保守性
- `src/api/client.ts` が肥大化して責務過多
- Worker も単一ファイル集中で分離余地が大きい

### 7) 著作権・法的・商用リスク（法務助言ではない）

- リポジトリ内に明確な第三者コンテンツの無断同梱は見当たりません。
- OSS依存パッケージのライセンス遵守（表示・再配布条件）は必須です。
- 生成音声/生成テキストでも、利用規約違反や権利侵害の可能性はゼロではありません。
- 商用展開前に ElevenLabs 等の規約・ポリシー整合を必ず確認してください。
- 将来、声色クローン・有名人類似表現を扱う場合は同意/パブリシティ権の検討が必須です。

### 8) 「READMEやバックエンドが外部から見えないか？」への回答

- GitHub リポジトリが公開なら `README.md` と `worker/` 配下コードは外部から閲覧可能です。
- Worker を公開デプロイすれば API エンドポイントにも外部到達できます（認証を足さない限り）。
- ただし、Wrangler Secrets に保存した秘匿値そのものはソースに出ません。

### 9) 正確なセットアップ手順

#### 前提
- Node.js 18+
- npm
- Cloudflareアカウント + Wranglerログイン
- ElevenLabs API Key

#### 9.1 フロント
```bash
npm install
cp .env.example .env
```

`.env` を編集:
```dotenv
VITE_API_BASE=http://localhost:8787
VITE_API_SESSION_START_PATH=/api/session/start
VITE_ELEVENLABS_AGENT_ID=
```

起動:
```bash
npm run dev
```

#### 9.2 Worker
```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ELEVENLABS_API_KEY
# 任意
npx wrangler secret put GEMINI_API_KEY
npx wrangler dev
```

### 10) 復旧・マイグレーションについて

現行リポジトリでは、`worker/wrangler.toml` に最低限の migration 記述はあるものの、稼働 API は Durable Objects 依存が限定的です。
障害復旧を厳密化するなら、以下を追加してください。
- バージョン付き状態スキーマ
- migrate/apply/verify を一気通貫で実行するスクリプト
- 復旧後の API 疎通スモークテスト

---

## Notes on what should NOT be documented (applied)

This README intentionally avoids:
- vague or unverifiable claims,
- private personal information,
- detailed exploit/security-sensitive internals,
- outdated statements that diverge from current code,
- over-explaining unshipped internal prototypes.
