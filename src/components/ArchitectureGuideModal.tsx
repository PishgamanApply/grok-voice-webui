import React, { useState } from 'react';
import { BookOpen, X, Copy, Check, ShieldCheck, Cpu, Mic, Volume2, Globe, Server } from 'lucide-react';

interface ArchitectureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgentId: string;
}

export const ArchitectureGuideModal: React.FC<ArchitectureGuideModalProps> = ({
  isOpen,
  onClose,
  currentAgentId,
}) => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const serverSnippet = `// server.js (Node.js + Express + ws)
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const XAI_API_KEY = process.env.XAI_API_KEY;
const AGENT_ID = '${currentAgentId}';

wss.on('connection', (clientWs) => {
  // 1. اتصال امن از سرور شما به سرور xAI با ارسال هدر احراز هویت
  const upstreamWs = new WebSocket(\`wss://api.x.ai/v1/realtime?agent_id=\${AGENT_ID}\`, {
    headers: { Authorization: \`Bearer \${XAI_API_KEY}\` }
  });

  // 2. انتقال پیام‌های دریافتی از xAI به مرورگر کاربر
  upstreamWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary });
    }
  });

  // 3. انتقال بسته‌های صدای میکروفون کاربر از مرورگر به xAI
  clientWs.on('message', (data, isBinary) => {
    if (upstreamWs.readyState === WebSocket.OPEN) {
      upstreamWs.send(data, { binary: isBinary });
    }
  });

  clientWs.on('close', () => upstreamWs.close());
  upstreamWs.on('close', () => clientWs.close());
});

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/api/grok-ws')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(3000, () => console.log('Relay running on port 3000'));`;

  const clientSnippet = `// client.js (در مرورگر)
const ws = new WebSocket(\`wss://\${location.host}/api/grok-ws\`);

// دریافت پاسخ صوتی و پخش با Web Audio API
const audioCtx = new AudioContext({ sampleRate: 24000 });
let nextPlayTime = 0;

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'response.output_audio_transcript.delta') {
    console.log('Agent Transcript:', data.delta);
  } else if (data.type === 'response.output_audio.delta') {
    // تبدیل Base64 PCM16 به صدا و پخش پیوسته
    const raw = atob(data.delta);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);
    
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

    const buffer = audioCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    
    const startTime = Math.max(audioCtx.currentTime, nextPlayTime);
    source.start(startTime);
    nextPlayTime = startTime + buffer.duration;
  }
};

// ارسال پیام متنی یا صوتی
function sendTextMessage(text) {
  ws.send(JSON.stringify({
    type: 'conversation.item.create',
    item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] }
  }));
  ws.send(JSON.stringify({ type: 'response.create' }));
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-base">راهنمای معماری اتصال مرورگر به Grok Voice API</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed">
          {/* Important Notice */}
          <div className="bg-cyan-950/40 border border-cyan-800/80 rounded-xl p-4 flex gap-3 text-cyan-200">
            <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-cyan-100">چرا مرورگر نمی‌تواند مستقیماً به xAI وصل شود؟</h4>
              <p className="text-xs text-cyan-300">
                ۱. در جاوااسکریپت مرورگر، امکان تنظیم هدر سفارشی (مانند <code className="bg-cyan-900/60 px-1 py-0.5 rounded text-white font-mono">Authorization: Bearer ...</code>) در زمان ساخت <code className="bg-cyan-900/60 px-1 py-0.5 rounded text-white font-mono">new WebSocket()</code> مسدود است.<br />
                ۲. اگر کلید خصوصی <code className="bg-cyan-900/60 px-1 py-0.5 rounded text-white font-mono">XAI_API_KEY</code> در مرورگر قرار گیرد، هر کاربری می‌تواند به راحتی در Inspect Element آن را بدزدد و هزینه تولید کند.
              </p>
            </div>
          </div>

          {/* Architectural Diagram */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>معماری استاندارد و حرفه‌ای (Gateway Relay Pattern):</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center my-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center">
                <Globe className="w-8 h-8 text-cyan-400 mb-2" />
                <span className="font-semibold text-white text-xs">مرورگر کاربر (Frontend)</span>
                <span className="text-[11px] text-slate-400 mt-1">ضبط صدا با Web Audio API، تبدیل به PCM16 و ارسال به سرور شما</span>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-700/50 rounded-lg flex flex-col items-center">
                <Server className="w-8 h-8 text-indigo-400 mb-2" />
                <span className="font-semibold text-indigo-200 text-xs">سرور شما (Backend Relay)</span>
                <span className="text-[11px] text-slate-400 mt-1">نگهداری امن کلید API، اتصال مستقیم به xAI و رله کردن دوطرفه صدا</span>
              </div>

              <div className="p-3 bg-purple-950/40 border border-purple-700/50 rounded-lg flex flex-col items-center">
                <Volume2 className="w-8 h-8 text-purple-400 mb-2" />
                <span className="font-semibold text-purple-200 text-xs">سرور xAI Grok Voice</span>
                <span className="text-[11px] text-slate-400 mt-1">مدل صوتی هوش مصنوعی، تبدیل صوت به متن و تولید صدای ایجنت با PCM 24kHz</span>
              </div>
            </div>
          </div>

          {/* Code 1: Backend Relay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>۱. کد سمت سرور رله (Node.js / Express / ws):</span>
              </h4>
              <button
                onClick={() => copyCode('server', serverSnippet)}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                {copiedSnippet === 'server' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی کد سرور</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto dir-ltr text-left">
              {serverSnippet}
            </pre>
          </div>

          {/* Code 2: Client Web Audio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                <span>۲. کد پخش و ارسال صوت در مرورگر (Client Web Audio API):</span>
              </h4>
              <button
                onClick={() => copyCode('client', clientSnippet)}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                {copiedSnippet === 'client' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی کد کلاینت</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto dir-ltr text-left">
              {clientSnippet}
            </pre>
          </div>

          {/* Deployment steps */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs text-slate-300">
            <h5 className="font-semibold text-slate-100 text-sm">مراحل استقرار برای کاربران عمومی:</h5>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
              <li>کلید <code className="text-white font-mono">XAI_API_KEY</code> را در متغیرهای محیطی هاست/سرور قرار دهید.</li>
              <li>سرور این برنامه از قبل مجهز به همین Gateway Relay کامل است و بدون نیاز به نصب اضافی اجرا می‌شود.</li>
              <li>در صورت استفاده از پروکسی معکوس مثل Nginx یا Cloudflare، مطمئن شوید پروتکل WebSocket (<code className="text-white font-mono">Upgrade: websocket</code>) فعال است.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
