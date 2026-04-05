# Microwave Show

> **Last audited: April 5, 2026 (UTC)**
> React + TypeScript + Vite frontend with Cloudflare Worker backend.

---

## English

### TL;DR (Conclusion First)
Microwave Show is a creative, short-session entertainment app that turns microwave wait time into an AI-narrated mini show. The current implementation is usable and visually strong, but for commercial launch you still need stricter abuse controls (auth/rate limiting), clearer production hardening, and stronger defensibility (moat). This README documents the app as-is, without exposing sensitive implementation details that would create avoidable security risk.

---

## 1) Product Overview (What it does now)

Current user flow:
1. **Top page** (`TopPage`)
2. **Settings page** (`SettingsPage`): time, dish name, narration style, voice language
3. **Countdown page** (`CountdownPage`): live narration + TTS + music/SFX + visual effects
4. **Result page** (`ResultPage`): replay/home/top actions

Implemented experience:
- Bilingual UI (`ja` / `en`)
- Dark/light theme toggle
- AI narration + synthesized voice + generated SFX/music (with local fallback behavior)

---

## 2) UI Analysis (Simple & Intuitive?)

### What is already good
- **Single primary action per screen** keeps navigation understandable.
- **Progressive disclosure flow** avoids dumping all options at once.
- **Preset durations** reduce input effort.
- **Immediate feedback** (audio + motion + text) sustains engagement in short sessions.

### Where UX friction still exists
- Visual/audio density is intentionally high; some users may feel sensory overload.
- Choice set in settings can increase decision time for first-time users.
- Error states are user-friendly, but loading-stage transparency could be more explicit.

### Low-risk UX improvements (without changing the brand style)
- Add a **Quick Start** CTA (default 60s + default style).
- Add **Reduced Effects** mode for accessibility/performance-sensitive devices.
- Add explicit loading phases (“Preparing narration”, “Generating voice”, etc.).

---

## 3) Technical Architecture (Fact-based)

### Frontend
- React + TypeScript + Vite
- Tailwind CSS
- Lazy-loaded page modules (`SettingsPage`, `CountdownPage`, `ResultPage`)
- Local persistence via `localStorage` / `sessionStorage`

### Backend (Cloudflare Worker)
Exposed routes currently include:
- `POST /api/agent/narration`
- `POST /api/tts`
- `POST /api/generate-sfx`
- `POST /api/generate-music`
- `POST /api/session/*` (compatibility-style mocked response path)

### Providers
- Text generation: Gemini (if configured), fallback Workers AI
- Voice/SFX/Music: ElevenLabs APIs

---

## 4) Code Review Summary (Brutally Honest)

### Strong points
- Frontend already includes fallback handling and progressive loading behavior.
- Audio paths are resilient compared to a naive direct-call implementation.
- Input sanitization and bounded payload handling exist in worker paths.

### Risks that still matter
- **CORS wildcard (`*`) + no user auth** means abuse protection is still weak for public deployment.
- Session endpoints are compatibility/mocked style; if you need strict server authority/state integrity, backend contract should be tightened.
- Worker code is still monolithic; long-term maintainability would benefit from route/service separation.

### Priority fixes for production
1. Add auth and per-IP/user rate limits at the edge.
2. Add abuse telemetry and request anomaly alerts.
3. Move provider adapters to isolated modules + contract tests.
4. Define explicit SLOs (latency/error budget) and enforce with CI gates.

---

## 5) Security, Visibility, and Access Control

### “Can outsiders see README and backend code?”
- If this repository is **public**, both `README.md` and backend source (`worker/`) are visible by design.
- Deployed worker endpoints are internet-reachable unless access controls are added.
- API secrets should remain server-side via Wrangler secrets (never commit secrets in repo).

### Is backend inaccessible from outside by default?
- **No.** A deployed HTTP API is externally reachable by default.
- To restrict access, add auth tokens, signed requests, origin policy checks, and rate limiting.

---

## 6) Legal / Copyright / Commercial Risk Check (Non-lawyer)

### What looks clean today
- No obvious bundled copyrighted media assets found in repo.
- Uses OSS dependencies in standard npm workflow.

### What still requires legal diligence before commercialization
- Provider ToS compliance (Gemini, Workers AI, ElevenLabs).
- Voice/content rights and jurisdiction-specific publicity/impersonation boundaries.
- Proper license notices and attribution obligations for dependencies.

> This is a technical/product risk assessment, **not legal advice**. Use counsel for launch-critical decisions.

---

## 7) Market, Demand, Competition, Differentiation, Moat, Monetization

### Market need
- Strong for “micro-entertainment in idle moments”.
- Good fit for social-friendly short interactions.

### Competition
- Adjacent: timer apps, novelty AI voice apps, short meme experiences.
- Direct niche competition likely limited now, but concept-level imitation is easy.

### Differentiation opportunities
- Better timing orchestration quality than generic AI toy apps.
- Social export + remix loops.
- Persistent narrator persona tuned to user preference history.

### Moat (current vs target)
- **Current moat: weak-to-moderate** (creative concept, but replicable).
- **Target moat:** proprietary orchestration quality + distribution loop + creator ecosystem.

### Monetization candidates
- Freemium style packs/voice packs
- Credit-based premium renders
- B2B branded seasonal packs
- Creator partnerships and affiliate content loops

---

## 8) Installation & Runbook (Complete)

### Prerequisites
- Node.js 18+
- npm
- Cloudflare account + Wrangler login
- ElevenLabs API key

### Frontend
```bash
npm install
cp .env.example .env
npm run dev
```

Example `.env` values:
```dotenv
VITE_API_BASE=http://localhost:8787
VITE_API_SESSION_START_PATH=/api/session/start
VITE_ELEVENLABS_AGENT_ID=
```

### Worker (local)
```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ELEVENLABS_API_KEY
# optional
npx wrangler secret put GEMINI_API_KEY
npx wrangler dev
```

### Checks
```bash
npm run lint
npm run typecheck
npm run build
# optional e2e bootstrap (tries primary+mirror, skips gracefully if blocked)
npm run e2e:install
# optional e2e
npm run e2e
```

---

## 9) Migration / Recovery Note

Current `worker/wrangler.toml` has a minimal migration section.
For full disaster recovery in production, maintain a single authoritative recovery process that includes:
- environment bootstrap,
- secret provisioning,
- migration/state versioning,
- post-restore smoke tests.

---

## 10) README Quality Rules (Applied)

This README intentionally avoids:
- ambiguous or outdated claims,
- incomplete setup steps,
- personal/private information,
- sensitive security implementation details,
- detailed unfinished internal features.

---

## 日本語

### 要約（結論先出し）
Microwave Show は「待ち時間を短時間エンタメ化する」体験として成立しています。UIも直感的に使える水準です。ただし商用本番で戦うには、**認証・レート制限・不正利用対策・運用監視**がまだ不足しています。ここでは現行コードと運用実態に合わせて、過不足なく説明します。

---

## 1) プロダクト概要（現状機能）

現在の利用フロー:
1. **トップ** (`TopPage`)
2. **設定** (`SettingsPage`)：時間・料理名・スタイル・音声言語
3. **カウントダウン** (`CountdownPage`)：実況テキスト + 音声 + BGM/SFX + 演出
4. **結果** (`ResultPage`)：リプレイ/戻る導線

実装済み体験:
- 日本語/英語UI
- ダーク/ライトテーマ
- AI実況 + 音声生成 + 効果音/音楽生成（ローカルフォールバックあり）

---

## 2) UI分析（シンプルで直感的か）

### 良い点
- **1画面1主目的**で迷いにくい
- 段階的フローで理解コストが低い
- 時間プリセットが入力負荷を下げる
- フィードバックが速く、短時間体験として没入しやすい

### 課題
- 演出密度が高く、ユーザーによっては疲れやすい
- 初回ユーザーには選択肢が多く感じる可能性
- 生成中の内部ステータス表示が不足

### デザインを壊さない改善案
- **クイックスタート**（60秒・既定スタイル）
- **演出軽減モード**（アクセシビリティ/低スペック端末向け）
- 生成ステージ明示（実況生成中・音声生成中など）

---

## 3) 技術構成（事実ベース）

### フロント
- React + TypeScript + Vite
- Tailwind CSS
- 画面は遅延読み込み
- `localStorage` / `sessionStorage` で状態保持

### バックエンド（Cloudflare Worker）
- `POST /api/agent/narration`
- `POST /api/tts`
- `POST /api/generate-sfx`
- `POST /api/generate-music`
- `POST /api/session/*`（互換目的の簡易応答）

### 外部AI/音声
- Gemini（利用可能時）→ Workers AI フォールバック
- ElevenLabs（音声・効果音・音楽）

---

## 4) コードレビュー（厳しめ）

### 強み
- フロントはフォールバック経路が比較的厚い
- 音声系呼び出しは耐障害性を意識した実装
- Worker側で入力サニタイズと長さ制限あり

### まだ危ない点
- **CORS `*` + 認証なし** のため、公開運用時の濫用耐性は不足
- セッションAPIは簡易互換応答で、厳密な状態管理向けではない
- Workerの責務が単一ファイルに集約され保守性が伸びにくい

### 優先対応
1. 認証 + レート制限（IP/ユーザー単位）
2. 不正利用検知・監視アラート
3. ルーティング/プロバイダ処理の分割
4. CIでSLO（遅延/失敗率）を継続監視

---

## 5) README/バックエンドの外部可視性について

### 「READMEやバックエンドコードは外部から見えるか？」
- リポジトリが**公開**なら `README.md` と `worker/` ソースは見えます。
- デプロイ済みAPIは、制限を入れない限り外部到達可能です。
- 秘密情報はWrangler secrets運用ならソースに露出しません。

### 「外部からアクセス不可か？」
- **デフォルトでは不可ではありません（アクセス可能）**。
- 制限したいなら認証・署名・オリジン検証・レート制限が必要です。

---

## 6) 著作権・法的・商用観点（非弁護士見解）

### 現時点で問題が見えにくい点
- リポジトリ内に明確な第三者著作物バンドルは見当たりません。
- OSS依存は一般的な構成です。

### 商用で要確認
- 各プロバイダ規約遵守（Gemini/Workers AI/ElevenLabs）
- 音声・人格権・肖像/パブリシティ権の境界
- OSSライセンス表示義務

> これは法的助言ではありません。公開・販売前は必ず法務確認してください。

---

## 7) 機能・需要・競合・差別化・Moat・収益化

### 需要
- “待ち時間の可処分注意”を取る体験として需要あり
- SNS共有との相性が良い

### 競合
- 隣接: タイマーアプリ、AI音声お遊び、ミーム体験
- 直競合は限定的でも、アイデア模倣は容易

### 差別化
- 音声と時間演出の同期品質
- 共有・再編集ループ
- 個人最適化された実況者体験

### Moat
- **現状は弱〜中**（発想は真似されやすい）
- 配布力・体験品質・クリエイター経済圏で強化可能

### 収益化
- フリーミアム（スタイル/音声パック）
- クレジット課金（高品質生成）
- B2Bタイアップ（季節・商品テーマ）
- クリエイター連携

---

## 8) セットアップ（不完全情報を避けた手順）

### 前提
- Node.js 18+
- npm
- Cloudflare + Wranglerログイン
- ElevenLabs APIキー

### フロント
```bash
npm install
cp .env.example .env
npm run dev
```

`.env` 例:
```dotenv
VITE_API_BASE=http://localhost:8787
VITE_API_SESSION_START_PATH=/api/session/start
VITE_ELEVENLABS_AGENT_ID=
```

### Worker
```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ELEVENLABS_API_KEY
# 任意
npx wrangler secret put GEMINI_API_KEY
npx wrangler dev
```

### 検証
```bash
npm run lint
npm run typecheck
npm run build
npm run e2e:install
npm run e2e
```

---

## 9) マイグレーション / 障害復旧

`worker/wrangler.toml` の migration 定義は最小構成です。
本番の復旧性を上げるには、
- 環境再構築手順
- Secret再投入手順
- migration/stateバージョン管理
- 復旧後スモークテスト
を一体化した「単一の復旧ランブック」を維持してください。

---

## 10) このREADMEで意図的に書かないこと

- 不正確/曖昧/古い情報
- 不完全な導入手順
- 個人情報
- 脆弱性を悪用しやすくする詳細
- 未完成機能の内部仕様の過剰公開
