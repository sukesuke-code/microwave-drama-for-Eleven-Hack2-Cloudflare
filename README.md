# Microwave Show

Microwave Show is a browser app that turns microwave waiting time into a short drama-like experience with themed narration, visual effects, and a replay/share loop.

---

## English

## Conclusion First (Executive Summary)
- **Product quality:** Strong demo quality, clear flow, memorable visual identity.
- **UI quality:** Mostly intuitive (Top → Settings → Countdown → Result), but visual density may be high for motion-sensitive users.
- **Security posture (this repo only):** Basic front-end hardening exists (CSP/meta policy, client-side input normalization, HTTPS API-base guard, request timeout/retry, effect rate-limiting). This is good but **not sufficient** for full production-grade security without backend enforcement.
- **Legal/commercial viability:** No obvious blocking issue found in this codebase itself, but you still must confirm third-party licenses/terms and trademark usage before commercialization.
- **Code visibility reality:** In web apps, shipped frontend code is always inspectable by users. Public README is public by definition.

---

## 1) What this app currently does
- Language/theme switch on landing.
- Timer setup (preset + manual), optional dish name, style selection.
- Countdown with narration updates, pause/resume, visual effects.
- Result screen with replay/share and return navigation.

Core flow: **Top → Settings → Countdown → Result**.

---

## 2) UI analysis (simple & intuitive?)

### What is strong
- **Linear navigation** minimizes decision fatigue.
- **Large CTAs** and constrained options support quick operation.
- **Preset durations** reduce typing and speed up start.

### Friction risks
- The UI is expressive, but visual effects can feel busy under stress or in low-attention contexts.
- Style differences are understandable after use, but not fully obvious before first run.
- Accessibility can be improved further (reduced-motion pathway, more explicit ARIA/keyboard affordances).

### Practical verdict
- For entertainment-first use: good.
- For universal accessibility / low-cognitive-load utility use: needs another pass.

---

## 3) Code review summary

### Strengths
- Clear page separation and state-driven flow.
- Defensive storage access patterns and local fallback behavior.
- API client now has timeout/retry/input-clamp/rate-limit guards.

### Remaining engineering debt
- Some business/security guarantees cannot be solved in frontend only (authz, true rate limiting, DoW prevention, abuse prevention, secret management).
- No backend source in this repo, so end-to-end trust boundary cannot be fully audited here.

---

## 4) Security / privacy / anti-abuse assessment (practical, not theoretical)

### What this repo can do (already implemented)
- CSP/meta-policy on HTML.
- Client-side input normalization and clamping.
- HTTPS-only API base guard outside localhost.
- Request timeout + retry strategy for transient failures.
- Client-side effect-call throttling to reduce accidental rapid-fire expensive calls.

### What this repo cannot guarantee alone
- **DoS/DoW defense:** real protection requires server-side rate limiting, quotas, billing guardrails, and WAF controls.
- **Data confidentiality at rest/in processing:** requires backend infra controls (key management, scoped auth, audit logs, retention policy).
- **Tamper-proof frontend:** impossible on web clients; shipped JS is inspectable.

### User data exposure risk (current scope)
- This frontend stores lightweight UI/session values (e.g., locale/theme/session ID in browser storage).
- Do not treat client storage as secret storage.

---

## 5) Legal / copyright / commercial review

> Not legal advice.

### What looks safe in this repo
- Code structure and UI implementation appear to be ordinary original app code patterns.
- Open-source dependencies are standard and common.

### What you must verify before production/commercial launch
- Dependency licenses and attribution obligations.
- Third-party API terms (especially voice/audio generation providers).
- Font/media asset usage terms.
- Trademark/content policy compliance for slogans, names, promotional claims, and video assets.
- Privacy policy + ToS + regional compliance (consumer law, data law).

---

## 6) Can external users access README/backend/frontend code?
- **README:** public if repository is public.
- **Frontend code:** downloadable/inspectable by users once shipped to browsers.
- **Backend code:** can be hidden **only** if deployed on private infrastructure and not included in client bundles.

If secrecy matters:
1. Keep repository private.
2. Keep secrets and business logic server-side.
3. Never ship API keys or privileged logic in frontend bundles.

---

## 7) Product demand / competition / differentiation / moat / monetization

### Demand hypothesis
- Everyday microwave use provides frequent short-session entry points.
- The app targets “micro-entertainment during waiting time.”

### Competitive landscape
- Generic timer apps.
- Focus/Pomodoro timer apps.
- Casual novelty mini-entertainment apps.

### Differentiation now
- Time-bound dramatic narration + visual identity around microwave context.

### Moat status
- Current moat is **experience design + brand flavor**, not hard-tech defensibility.

### Moat expansion path
- Creator marketplace for narration packs.
- User-generated templates with moderation.
- Personalized voice/style memory and progression loops.
- Distribution moat via short-form creator ecosystem.

### Monetization options
- Freemium: free core + paid style/voice packs.
- Seasonal or branded packs.
- B2B white-label “micro-break entertainment.”
- Campaign sponsorship tied to shareable countdown/result clips.

---

## 8) Cloudflare × ElevenLabs positioning (challenge-aligned narrative)
This project concept aligns with the “creative edge AI experience” direction:
- **Cloudflare Workers / Durable Objects** for low-latency session state and orchestration.
- **Edge-first architecture** for global responsiveness.
- **Voice AI integration** for narration quality and differentiation.
- **Viral video fit:** short, visual, emotionally exaggerated moments are inherently clip-friendly.

If you submit to a challenge/hackathon, focus on:
1. Clear architecture diagram.
2. Real-world latency/cost safeguards.
3. A polished short demo video with before/after experience impact.

---

## 9) Installation and local development

### Requirements
- Node.js 18+
- npm 9+

### Install
```bash
npm install
```

### Environment
```bash
cp .env.example .env
```

`VITE_API_BASE`
- Leave empty when API is served on same origin.
- Set to your backend base URL when API is hosted separately.

> Note: `.env.example` currently includes `VITE_API_SESSION_START_PATH`, but this frontend code does not actively consume that value at runtime.

### Run
```bash
npm run dev
```

### Validate
```bash
npm run lint
npm run typecheck
npm run build
```

### E2E
```bash
npm run e2e
```
If Playwright browser binaries are missing:
```bash
npx playwright install chromium
```

---

## 日本語

## 結論（先に要点）
- **完成度:** デモ品質としては高め。導線は明快。
- **UI:** 直感性は高いが、演出密度が高く感じるユーザー層には調整余地あり。
- **セキュリティ（このリポジトリ単体）:** フロント側で実用的な防御は実装済み。ただし、実運用レベルの耐攻撃性はバックエンド対策なしでは成立しない。
- **法務/商用:** コード単体で明確な禁止要素は見えないが、依存ライセンス・外部API規約・商標/表現の最終確認は必須。
- **可視性の現実:** 公開READMEは公開情報。配布フロントコードは取得可能。

---

## 1) 現在の機能
- トップ画面（言語/テーマ切替）
- 設定画面（時間、料理名、スタイル）
- カウントダウン画面（実況更新・一時停止/再開・演出）
- 結果画面（リプレイ/シェア/戻る）

導線は **Top → Settings → Countdown → Result** で一貫しています。

---

## 2) UI分析（シンプルで直感的か）

### 良い点
- **一直線の画面遷移**で迷いにくい。
- **主要ボタンが大きい**ため初見でも操作しやすい。
- **時間プリセット**で入力負荷が低い。

### 改善余地
- 演出が濃く、状況によっては情報量過多に感じる可能性。
- 初回利用時、スタイル差分の期待値が開始前にはやや伝わりにくい。
- アクセシビリティ（低モーション導線、キーボード操作強化）を追加すると完成度が上がる。

---

## 3) コードレビュー要約

### 良い点
- 画面責務分離が明快。
- ストレージアクセスやAPI通信に防御的実装がある。
- APIクライアントに timeout/retry/入力制御/連打抑止が入っている。

### 残課題
- 本質的な防御（認可、課金保護、監査、WAF）はサーバー側必須。
- このリポジトリにはバックエンド本体が含まれないため、全体の信頼境界はここだけでは検証しきれない。

---

## 4) セキュリティ・秘匿性・耐攻撃性（実務評価）

### このリポジトリで対応可能な範囲
- CSP等のフロント防御メタ。
- 入力正規化・長さ/数値クランプ。
- localhost以外のHTTPS APIベース強制。
- 一時障害向けretry + timeout。
- 高コストエンドポイントのクライアント側連打抑止。

### このリポジトリ単体では保証不能な範囲
- **DoS/DoWの本格対策**（サーバー側レート制限、クォータ、請求上限、WAF）。
- **機密保護の中核**（鍵管理、権限制御、監査ログ、保存ポリシー）。
- **フロント改ざん不可**（Web配布コードは利用者が取得可能）。

### データ漏洩観点
- フロント保存は軽量設定/セッション情報が中心。
- クライアント保存を秘密保管とみなしてはいけません。

---

## 5) 著作権・法務・商用観点

> 法的助言ではありません。

### 現時点で問題が見えにくい点
- コード実装は一般的な設計・実装パターン。
- 依存ライブラリも一般的なOSS群。

### 商用化前に必須確認
- 依存ライセンスと表示義務。
- 外部API（特に音声系）利用規約・商用条項。
- フォント/アセット利用条件。
- 商標・コピー表現・広告表現の法令順守。
- 利用規約/プライバシーポリシー整備と地域法対応。

---

## 6) READMEやバックエンドを外部から見えなくできるか
- READMEは公開リポジトリなら公開。
- フロントコードは配布時に利用者から取得可能。
- バックエンドのみ非公開化可能（サーバー側で運用し、クライアントに含めない）。

秘匿したいなら:
1. リポジトリをprivate化
2. 秘密ロジックはサーバー側限定
3. APIキー等をフロントに埋め込まない

---

## 7) 需要・競合・差別化・Moat・マネタイズ

### 需要仮説
- 電子レンジ待機は日常で頻度が高く、短時間体験と相性が良い。

### 競合
- 一般タイマーアプリ
- 集中タイマー（Pomodoro等）
- ミニエンタメ系アプリ

### 現状の差別化
- 「電子レンジ待機」に特化したドラマ演出体験。

### Moat現状
- 体験設計/ブランド文脈が中心。強固な技術Moatはこれから。

### Moat強化案
- クリエイター向け実況/音声パック市場
- UGCテンプレート（モデレーション前提）
- パーソナライズ記憶・継続利用ループ
- ショート動画連携による流通Moat

### マネタイズ案
- フリーミアム（基本無料 + 有料パック）
- 季節/ブランドコラボパック
- B2B向け待機時間エンタメ導入
- シェア動画連動スポンサー施策

---

## 8) Cloudflare × ElevenLabs 文脈での説明（提出向け）
本アプリの方向性は、エッジAI体験の文脈に適合します。
- Cloudflare Workers/Durable Objects を使った低遅延セッション管理
- エッジ中心の応答性
- 音声AIによる差別化
- ショート動画映えしやすい体験設計

提出時に強調すべきは:
1. アーキテクチャ図
2. レイテンシ/コスト対策
3. 体験インパクトが伝わる高品質な短尺デモ動画

---

## 9) ローカルセットアップ

### 必要環境
- Node.js 18+
- npm 9+

### インストール
```bash
npm install
```

### 環境変数
```bash
cp .env.example .env
```

`VITE_API_BASE`
- 同一オリジン配信なら空欄可
- 別ドメインAPI利用時はベースURLを設定

> 補足: `.env.example` に `VITE_API_SESSION_START_PATH` が存在しますが、現行フロントコードはこの値を実行時に利用していません。

### 起動
```bash
npm run dev
```

### 検証
```bash
npm run lint
npm run typecheck
npm run build
```

### E2E
```bash
npm run e2e
```
Playwrightブラウザが未導入なら:
```bash
npx playwright install chromium
```
