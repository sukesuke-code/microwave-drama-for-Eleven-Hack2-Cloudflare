import WebSocket from 'ws';

const API_BASE = 'https://microwave-show-backend.lolololololol.workers.dev';

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
    ws.on('open', () => console.log('✅ WebSocket opened'));
    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
      console.log('📩 Received:', data.type);
      if (data.type === 'conversation_initiation_metadata') {
        console.log('🎉 Connection successful!');
        ws.close();
      }
    });
    ws.on('error', (err) => console.error('❌ WebSocket error:', err.message));
  } catch (e) {
    console.error('🚨', e.message);
  }
})();
