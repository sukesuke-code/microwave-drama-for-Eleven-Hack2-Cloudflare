#!/usr/bin/env node
const WebSocket = require('ws');
const fetch = require('node-fetch');

// VITE_API_BASE が環境変数に入っていなければバックエンド URL をハードコード
const API_BASE = process.env.VITE_API_BASE ||
  'https://microwave-show-backend.lolololololol.workers.dev';

async function getSignedUrl() {
  const res = await fetch(`${API_BASE}/api/get-signed-url`);
  if (!res.ok) throw new Error(`GET signed URL failed: ${res.status}`);
  const data = await res.json();
  if (!data.signedUrl) throw new Error('signedUrl missing in response');
  return data.signedUrl;
}

(async () => {
  try {
    const url = await getSignedUrl();
    console.log('🔗 Signed URL:', url);

    const ws = new WebSocket(url);

    ws.on('open', () => {
      console.log('✅ WebSocket opened');
    });

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        console.log('📩 Received:', data.type);
        // 初期メタデータが来たらテスト成功として終了
        if (data.type === 'conversation_initiation_metadata') {
          console.log('🎉 Connection successful – received initiation metadata');
          ws.close();
        }
      } catch (_) {
        console.log('⚠️ Non‑JSON message:', msg);
      }
    });

    ws.on('error', (err) => {
      console.error('❌ WebSocket error:', err.message);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔚 Closed (code=${code}) ${reason}`);
    });
  } catch (e) {
    console.error('🚨', e.message);
    process.exit(1);
  }
})();
