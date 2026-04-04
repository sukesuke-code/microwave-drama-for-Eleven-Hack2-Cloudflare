# Microwave Show 🍿⚡️

Microwave Show turns the world's most boring waiting time into a dramatic, high-energy entertainment experience. Using **Cloudflare Workers**, **Durable Objects**, **Workers AI**, and **ElevenLabs Conversational AI**, it delivers real-time, context-aware narration synchronized across the edge.

---

## 🚀 Key Features

### 1. 🌐 Real-time Edge Synchronization (Cloudflare Durable Objects)
Experience perfectly synced countdowns. By utilizing **Durable Objects**, the "Microwave Session" state (time remaining, current phase) is managed at the edge. Multiple clients connecting to the same session will see the exact same countdown and phase updates simultaneously.

### 2. 🧠 AI-Powered "Director" (Cloudflare Workers AI)
The app doesn't just narrate; it directs. When a session starts, **Cloudflare Workers AI (Llama-3)** analyzes your dish (e.g., "Frozen Pizza") and generates a unique acting direction for the narrator. This "Director's Note" is dynamically injected into the ElevenLabs context to ensure every show feels fresh.

### 3. 🎙 Premium Voice AI (ElevenLabs Conversational AI)
Voice narration is powered by **ElevenLabs**. Unlike static TTS, this uses a persistent WebSocket connection for real-time text-to-speech with cinematic expression, perfectly timed with the microwave's progress.

### 4. 🔒 Edge-Safe Security
All sensitive credentials (ElevenLabs API Keys and Agent IDs) are managed securely within Cloudflare's infrastructure using **Wrangler Secrets**. The frontend only receives a temporary, cryptographically **Signed URL** to establish the connection.

---

## 🛠 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
- **Backend (Edge)**: Cloudflare Workers (Hono).
- **State Management**: Cloudflare Durable Objects.
- **Inference**: Cloudflare Workers AI (@cf/meta/llama-3-8b-instruct).
- **Voice Agent**: ElevenLabs Conversational AI.

---

## 🏃‍♂️ Getting Started

### Backend Setup (Worker)
1. **Login to Cloudflare**:
   ```bash
   cd worker
   npx wrangler login
   ```
2. **Set Secrets**:
   ```bash
   npx wrangler secret put ELEVENLABS_API_KEY
   npx wrangler secret put ELEVENLABS_AGENT_ID
   ```
3. **Deploy or Run Locally**:
   ```bash
   npx wrangler dev
   ```

### Frontend Setup
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment**:
   Create `.env` (copy from `.env.example`). Set `VITE_API_BASE` to `http://localhost:8787`.
3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

---

# Microwave Show 🍿⚡️ (日本語版)

『Microwave Show』は、世界で最も退屈な「電子レンジの待ち時間」を、ドラマチックでハイテンションなエンターテインメントに変えるアプリです。**Cloudflare Workers**、**Durable Objects**、**Workers AI**、そして **ElevenLabs** を駆使し、エッジ側で同期されたリアルタイムな実況体験を届けます。

---

## 🚀 主な機能

### 1. 🌐 エッジでのリアルタイム同期 (Cloudflare Durable Objects)
**Durable Objects** を使用することで、電子レンジの「待機セッション（残り時間や進行状態）」をエッジサーバー上で一元管理します。複数のブラウザで同じセッションを開いても、カウントダウンと実況のフェーズが完全に同期されます。

### 2. 🧠 AIによる「裏監督」システム (Cloudflare Workers AI)
ただ実況するだけではありません。セッション開始時、**Cloudflare Workers AI (Llama-3)** がユーザーの料理名（例：「冷凍ピザ」）を解析し、実況者への「演技指導（ディレクターズ・ノート）」を瞬時に生成します。これが ElevenLabs のエージェントに注入され、毎回異なるテンションの実況が生まれます。

### 3. 🎙 高品質音声 AI (ElevenLabs Conversational AI)
実況の核心は **ElevenLabs** にあります。従来の静的なTTSとは異なり、リアルタイム WebSocket 接続を通じて、感情豊かでシネマティックな音声をレンジの進行に合わせてストリーミング配信します。

### 4. 🔒 エッジセーフ・セキュリティ
ElevenLabs の API キーや Agent ID などの機密情報は、Cloudflare のインフラ内で **Wrangler Secrets** として安全に管理されます。フロントエンドには一時的な「署名付きURL (Signed URL)」のみが渡されるため、不正利用のリスクを最小限に抑えたプロ仕様の設計です。

---

## 🛠 使用技術

- **フロントエンド**: React (Vite), Tailwind CSS, Lucide Icons.
- **バックエンド (Edge)**: Cloudflare Workers (Hono).
- **ステート管理**: Cloudflare Durable Objects.
- **推論 (Inference)**: Cloudflare Workers AI (@cf/meta/llama-3-8b-instruct).
- **ボイスエージェント**: ElevenLabs Conversational AI.

---

## 🏃‍♂️ セットアップ手順

### バックエンド (Worker) の準備
1. **Cloudflare にログイン**:
   ```bash
   cd worker
   npx wrangler login
   ```
2. **シークレットの設定**:
   ```bash
   npx wrangler secret put ELEVENLABS_API_KEY
   npx wrangler secret put ELEVENLABS_AGENT_ID
   ```
3. **ローカル起動**:
   ```bash
   npx wrangler dev
   ```

### フロントエンドの準備
1. **依存関係のインストール**:
   ```bash
   npm install
   ```
2. **環境変数の設定**:
   `.env` ファイルを作成し、`VITE_API_BASE` に `http://localhost:8787` を設定してください。
3. **アプリの起動**:
   ```bash
   npm run dev
   ```
