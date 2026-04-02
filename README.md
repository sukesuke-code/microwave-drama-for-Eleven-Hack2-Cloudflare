# Microwave Show (React Native + Web)

このプロジェクトは **Expo + React Native** へ移行済みです。1つのコードベースから iOS / Android / Web を提供します。

## 起動

```bash
npm install
npm run dev
```

- Web: `npm run web`
- iOS: `npm run ios`
- Android: `npm run android`

## 検証

```bash
npm run lint
npm run typecheck
npm run test
```

## 構成

- `App.tsx`: 画面本体（設定 + カウントダウン + ナレーション）
- `src/narrations.ts`: スタイルごとの実況テキスト

## バージョン比較（結論）

- 旧構成（React + Vite）: Web 専用で App Store / Google Play へは別実装が必要。
- 新構成（Expo React Native）: Web / iOS / Android を同時開発でき、運用コストが低い。
- **最適案**: リリース先が Web + モバイル前提なら新構成が最適。
