import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(express.json());

const PORT = parseInt(process.env.PORT || '3000', 10);
const DEFAULT_AGENT_ID = 'agent_zUSPneIFwL9LP1Kn';

// Health check and status endpoint
app.get('/api/config-status', (req: Request, res: Response) => {
  const hasEnvKey = Boolean(process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    hasEnvKey,
    defaultAgentId: DEFAULT_AGENT_ID,
    timestamp: new Date().toISOString(),
  });
});

// Create WebSocket server for bridging browser audio & events to xAI Grok Voice API
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (clientWs: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const agentId = url.searchParams.get('agent_id') || process.env.XAI_AGENT_ID || DEFAULT_AGENT_ID;
  const apiKey = url.searchParams.get('api_key') || process.env.XAI_API_KEY || '';
  const mode = url.searchParams.get('mode') || (apiKey ? 'grok' : 'simulator');

  console.log(`[WS] Client connected. Mode: ${mode}, AgentId: ${agentId}, HasApiKey: ${Boolean(apiKey)}`);

  if (mode === 'grok' && apiKey) {
    // Upstream connection to xAI Realtime API
    const upstreamUrl = `wss://api.x.ai/v1/realtime?agent_id=${encodeURIComponent(agentId)}`;
    console.log(`[WS] Connecting upstream to xAI: ${upstreamUrl}`);

    let upstreamWs: WebSocket | null = null;
    try {
      upstreamWs = new WebSocket(upstreamUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (err: any) {
      console.error('[WS] Error initializing upstream WebSocket:', err.message);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: {
          message: `Failed to initialize connection to x.ai: ${err.message}`,
        },
      }));
      clientWs.close();
      return;
    }

    // Upstream event handlers
    upstreamWs.on('open', () => {
      console.log('[WS] Connected to xAI upstream successfully');
      clientWs.send(JSON.stringify({
        type: 'gateway.connected',
        target: 'xai',
        agent_id: agentId,
      }));
    });

    upstreamWs.on('message', (data: any, isBinary: boolean) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data, { binary: isBinary });
      }
    });

    upstreamWs.on('error', (err: any) => {
      console.error('[WS] Upstream xAI error:', err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          error: {
            message: `xAI Upstream Error: ${err.message || 'Connection error'}`,
          },
        }));
      }
    });

    upstreamWs.on('close', (code: number, reason: Buffer) => {
      console.log(`[WS] Upstream xAI closed (${code}): ${reason.toString()}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'gateway.disconnected',
          code,
          reason: reason.toString(),
        }));
        clientWs.close();
      }
    });

    // Client event handlers
    clientWs.on('message', (data: any, isBinary: boolean) => {
      if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
        upstreamWs.send(data, { binary: isBinary });
      } else {
        console.warn('[WS] Received message from client but upstream is not open');
      }
    });

    clientWs.on('close', () => {
      console.log('[WS] Client disconnected');
      if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
        upstreamWs.close();
      }
    });

    clientWs.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
      if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
        upstreamWs.close();
      }
    });

  } else {
    // Simulator Mode (for testing without xAI API key or when explicitly chosen)
    console.log('[WS] Running in Simulator mode');
    clientWs.send(JSON.stringify({
      type: 'gateway.connected',
      target: 'simulator',
      agent_id: agentId,
      notice: 'در حال اجرای حالت شبیه‌ساز (Simulator) برای تست رابط کاربری، میکروفون و پخش صدا بدون کلید xAI.',
    }));

    // Send initial session created event
    clientWs.send(JSON.stringify({
      type: 'session.created',
      session: {
        id: `sim_sess_${Date.now()}`,
        model: 'grok-voice-preview-sim',
        agent_id: agentId,
      },
    }));

    let userAudioChunks: string[] = [];

    clientWs.on('message', async (raw: any) => {
      try {
        const event = JSON.parse(raw.toString());
        
        if (event.type === 'input_audio_buffer.append') {
          if (event.audio) {
            userAudioChunks.push(event.audio);
          }
        } else if (event.type === 'input_audio_buffer.commit') {
          clientWs.send(JSON.stringify({
            type: 'input_audio_buffer.committed',
            item_id: `item_${Date.now()}`,
          }));
        } else if (event.type === 'conversation.item.create') {
          // Acknowledge user message
          clientWs.send(JSON.stringify({
            type: 'conversation.item.created',
            item: event.item,
          }));
        } else if (event.type === 'response.create') {
          // Simulate agent response
          clientWs.send(JSON.stringify({
            type: 'response.created',
            response: { id: `resp_${Date.now()}`, status: 'in_progress' },
          }));

          const sampleReplies = [
            'سلام! من ایجنت صوتی Grok هستم. صدای شما را دریافت کردم و ارتباط دوطرفه صوتی به درستی برقرار است.',
            'درود بر شما! اتصال WebSocket با موفقیت انجام شد. چطور می‌توانم به شما کمک کنم؟',
            'Hello there! I am your Grok Voice Agent running through the secure WebSocket proxy relay.',
            'پیام شما دریافت شد. سیستم پردازش بلادرنگ صوتی در حال حاضر کاملاً آماده است.',
          ];
          const text = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

          // Stream transcript in deltas
          const words = text.split(' ');
          for (let i = 0; i < words.length; i++) {
            await new Promise((r) => setTimeout(r, 120));
            if (clientWs.readyState !== WebSocket.OPEN) return;
            clientWs.send(JSON.stringify({
              type: 'response.output_audio_transcript.delta',
              delta: (i > 0 ? ' ' : '') + words[i],
            }));
          }

          // Generate synthetic tone audio deltas (PCM16 24kHz sine wave beeps or harmonic chords)
          const sampleRate = 24000;
          const durationSec = 1.2;
          const totalSamples = Math.floor(sampleRate * durationSec);
          const pcmBuffer = Buffer.alloc(totalSamples * 2);

          for (let s = 0; s < totalSamples; s++) {
            const t = s / sampleRate;
            // pleasant gentle melodic chime
            const freq = 440 + Math.sin(t * 12) * 80;
            const env = Math.exp(-t * 2.5); // decay
            const val = Math.sin(2 * Math.PI * freq * t) * env * 0.4;
            const sample16 = Math.max(-32768, Math.min(32767, Math.floor(val * 32767)));
            pcmBuffer.writeInt16LE(sample16, s * 2);
          }

          // Send audio delta
          const chunkSize = 4800; // ~100ms chunks
          for (let offset = 0; offset < pcmBuffer.length; offset += chunkSize) {
            const end = Math.min(offset + chunkSize, pcmBuffer.length);
            const chunkBase64 = pcmBuffer.subarray(offset, end).toString('base64');
            clientWs.send(JSON.stringify({
              type: 'response.output_audio.delta',
              delta: chunkBase64,
            }));
            await new Promise((r) => setTimeout(r, 90));
          }

          clientWs.send(JSON.stringify({
            type: 'response.done',
            response: { status: 'completed' },
          }));

          userAudioChunks = [];
        }
      } catch (e: any) {
        console.error('[WS Simulator] Error handling message:', e.message);
      }
    });

    clientWs.on('close', () => {
      console.log('[WS Simulator] Client disconnected');
    });
  }
});

// Upgrade HTTP requests on /api/grok-ws to WebSocket
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/api/grok-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] WebSocket endpoint available at ws://localhost:${PORT}/api/grok-ws`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
