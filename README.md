# Microwave Show

Microwave Show is a browser app that turns microwave waiting time into a short “drama” experience with themed narration (Sports / Movie / Horror / Nature), visual effects, and a countdown flow.

---

## English

### 1) Product Summary
- **Core value:** convert dead waiting time into lightweight entertainment.
- **Primary use case:** users set a timer, optionally enter a dish name, choose a narration style, and start.
- **Output:** animated countdown + dynamic narration + result screen with replay/share.

### 2) Feature Set (Current)
- Top page with language/theme switcher.
- Settings page:
  - Duration presets and manual duration input.
  - Optional dish name.
  - Narration style selection.
- Countdown page:
  - Time progress, narration updates, pause/resume.
  - Style-specific visual mood.
- Result page:
  - Completion message, replay, share, return to top.
- Basic E2E test scaffold with Playwright (`tests/e2e/app-flow.spec.ts`).

### 3) UI/UX Review (Simplicity & Intuitiveness)
**What works**
- A clear linear flow: Top → Settings → Countdown → Result.
- Large CTA buttons and minimal decision points.
- Preset durations reduce cognitive load.

**What still needs improvement**
- Visual effects are attractive but dense; some users may feel “too busy.”
- First-time users may not immediately understand style differences before starting.
- Accessibility depth (e.g., stronger keyboard/ARIA coverage and motion sensitivity options) can be improved.

### 4) Competitive Positioning
- **Direct alternatives:** generic kitchen timer apps, focus timer apps, novelty mini-entertainment apps.
- **Differentiation:** personality-rich narration styles around microwave moments (micro-entertainment niche).
- **Moat today:** mostly brand/UX concept and execution quality; not a hard technical moat yet.
- **Potential moat expansion:**
  - Distinct voice packs and creator ecosystem.
  - User-generated drama templates.
  - Progression/collection loops and social sharing loops.

### 5) Demand & Monetization Hypotheses
> These are product hypotheses, not validated business metrics.

- **Potential demand signals:**
  - High-frequency daily use context (microwave usage is common).
  - Good fit for short-session engagement.
- **Possible monetization models:**
  - Freemium: free core + paid premium voice/style packs.
  - Seasonal packs / branded packs.
  - B2B white-label “micro-break experience” bundles.

### 6) Security & Privacy Notes (Current State)
- Front-end CSP and defensive meta policies are present.
- Client storage is used for lightweight preferences (locale/theme).
- This repository does **not** show a full private backend service implementation.
- Therefore, server-side controls (rate limiting, authz, confidential processing) are out of scope here and should be implemented if backend features are added.

### 7) Legal / Copyright / Commercial Notes
This README is not legal advice.

- The app uses common UI patterns and original implementation structure in this repository.
- Dependencies are open-source packages; commercial use must follow each package license.
- Fonts and third-party assets/services should be reviewed against their own terms before production deployment.
- Brand names, slogans, and media-like copy should be reviewed for trademark/content policy compliance in target markets.

### 8) Can README or backend code be hidden from external users?
- In a typical web app, shipped frontend code is downloadable by end users.
- Public repository README is public by definition.
- To restrict access:
  - use a private repository,
  - keep sensitive logic on private servers,
  - never expose secrets in client bundles.

### 9) Tech Stack
- React + TypeScript + Vite
- TailwindCSS
- Playwright (E2E scaffold)

### 10) Local Setup
#### Requirements
- Node.js 18+
- npm 9+

#### Install
```bash
npm install
```

#### Environment variables
```bash
cp .env.example .env
```

- `VITE_API_BASE`: API base URL.  
  - Leave empty when API is served from the same origin (recommended default).
  - Set this when API is hosted on a different domain (e.g. Cloudflare Workers URL).
- `VITE_API_SESSION_START_PATH`: Session start endpoint path (default: `/api/session/start`).
  - If your backend uses a different path (e.g. `/session/start`), change this value to match backend routing.

#### Run development server
```bash
npm run dev
```

#### Preview built app locally
```bash
npm run build
npm run preview
```

For Cloudflare Worker local emulation, use:
```bash
npm run preview:cf
```

#### Lint / Typecheck / Build
```bash
npm run lint
npm run typecheck
npm run build
```

#### E2E
```bash
npm run e2e
```

If browser binaries are not installed, run:
```bash
npx playwright install chromium
```

---

## 日本語

### 1) プロダクト概要
- **コア価値:** 電子レンジ待ち時間を、短時間のエンタメ体験に変えること。
- **主な利用導線:** 時間設定 → （任意）料理名入力 → 実況スタイル選択 → 開始。
- **体験:** カウントダウン中に演出＋実況テキストが進行し、完了画面へ遷移。

### 2) 現在の主機能
- トップ画面（言語切替・テーマ切替）。
- 設定画面（プリセット時間・手動時間・料理名入力・実況スタイル選択）。
- カウントダウン画面（進捗表示、実況更新、一時停止/再開）。
- 結果画面（リプレイ、シェア、トップ復帰）。
- PlaywrightのE2Eテスト雛形（`tests/e2e/app-flow.spec.ts`）。

### 3) UI分析（シンプルさ・直感性）
**良い点**
- 画面遷移が一直線で迷いにくい（Top→Settings→Countdown→Result）。
- 主要操作のボタンが大きく、意思決定ポイントが少ない。
- 時間プリセットがあり、入力負荷が低い。

**改善余地**
- 視覚演出が強いので、人によっては情報量過多に感じる可能性がある。
- 初回利用者にとって、スタイル差の期待値が開始前にやや伝わりにくい。
- アクセシビリティ（キーボード操作、モーション低減配慮）の強化余地がある。

### 4) 需要・競合・差別化・Moat
- **競合:** 一般的なキッチンタイマー、集中タイマー、ミニエンタメ系アプリ。
- **差別化:** 「電子レンジ待ち」に特化した短尺ドラマ演出という用途特化。
- **現状Moat:** 主に体験設計とブランド文脈。強固な技術Moatはまだ限定的。
- **Moat拡張案:**
  - 音声/演出パック拡充
  - ユーザー作成テンプレート
  - 継続利用を促す収集・共有ループ

### 5) マネタイズ案（仮説）
> 以下は検証前の仮説であり、実測データではありません。

- フリーミアム（基本無料＋有料スタイル/音声パック）。
- 季節限定パック、コラボパック。
- B2B向けの待機時間エンタメ導入。

### 6) セキュリティ・秘匿性に関する現状
- フロント側でCSP等の防御メタ設定を適用。
- 保存データは主にUI設定（言語・テーマ）など軽量情報。
- このリポジトリには、秘匿処理を担う本格的バックエンド実装は含まれていません。
- したがって、本格的な耐攻撃性（認可・レート制限・監査）はサーバー側設計が前提です。

### 7) 著作権・法務・商用利用の注意
※法的助言ではありません。

- 本リポジトリ内コードは一般的な実装パターンで構成されています。
- 依存ライブラリは各ライセンス条件の遵守が必要です。
- 外部フォント/外部サービスは利用規約を個別確認してください。
- 商標・表現・コピーは、配布地域の法令/ガイドラインに沿って最終確認が必要です。

### 8) READMEやバックエンドを外部から見えなくできるか
- Web配布されるフロントコードは、基本的に利用者側から取得可能です。
- READMEは公開リポジトリでは公開情報です。
- 非公開化したい場合は、
  - リポジトリをprivate化、
  - 機密ロジックはサーバー側へ移管、
  - クライアントに秘密情報を埋め込まない、
  が必須です。

### 9) 技術スタック
- React + TypeScript + Vite
- TailwindCSS
- Playwright（E2E雛形）

### 10) セットアップ手順
#### 必要環境
- Node.js 18以上
- npm 9以上

#### インストール
```bash
npm install
```

#### 環境変数
```bash
cp .env.example .env
```

- `VITE_API_BASE`: API のベースURL。  
  - API が同一オリジン配信の場合は空欄のまま（推奨デフォルト）。
  - API を別ドメインで運用している場合（例: Cloudflare Workers URL）は値を設定。
- `VITE_API_SESSION_START_PATH`: セッション開始APIのパス（デフォルト: `/api/session/start`）。
  - バックエンドの実装が `/session/start` など別パスの場合、この値を合わせて変更。

#### 開発起動
```bash
npm run dev
```

#### ビルド後のローカルプレビュー
```bash
npm run build
npm run preview
```

Cloudflare Workers 相当でのローカル確認は以下を使ってください:
```bash
npm run preview:cf
```

#### 静的検証・ビルド
```bash
npm run lint
npm run typecheck
npm run build
```

#### E2E
```bash
npm run e2e
```

ブラウザバイナリが無い場合:
```bash
npx playwright install chromium
```
