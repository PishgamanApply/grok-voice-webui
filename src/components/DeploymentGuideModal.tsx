import React, { useState } from 'react';
import { Server, X, Copy, Check, Terminal, ShieldCheck, Container, Play, Layers } from 'lucide-react';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'vps' | 'nginx' | 'env'>('docker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dockerCommands = `# ۱. کلون کردن مخزن پروژه
git clone <آدرس_مخزن_شما>
cd grok-voice-agent

# ۲. ایجاد فایل تنظیمات محیطی
cp .env.example .env
nano .env   # کلید XAI_API_KEY خود را اینجا قرار دهید

# ۳. بیلد و اجرای خودکار با داکر کامپوز
docker compose up -d --build

# بررسی وضعیت کانتینر
docker compose ps
docker compose logs -f`;

  const vpsCommands = `# ۱. نصب Node.js (نسخه ۲۰ یا ۲۲) و ابزار PM2 روی لینوکس (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# ۲. ورود به پوشه پروژه و نصب وابستگی‌ها
cd /var/www/grok-voice-agent
npm install

# ۳. تنظیم فایل متغیرهای محیطی .env
echo "XAI_API_KEY=xai-YOUR_SECRET_KEY_HERE" >> .env
echo "NODE_ENV=production" >> .env
echo "PORT=3000" >> .env

# ۴. ساخت فایل‌های فرانت‌اند
npm run build

# ۵. اجرای برنامه با PM2 در پس‌زمینه
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup`;

  const nginxSnippet = `server {
    listen 80;
    server_name voice.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name voice.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/voice.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voice.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # تنظیمات حیاتی برای اتصال بلادرنگ صوتی WebSocket:
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # جلوگیری از قطع شدن مکالمه در زمان سکوت:
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">راهنمای گام‌به‌گام استقرار روی سرور (Deployment Guide)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('docker')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'docker'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Container className="w-4 h-4" />
            <span>روش ۱: با Docker & Docker Compose (پیشنهادی)</span>
          </button>

          <button
            onClick={() => setActiveTab('vps')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'vps'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>روش ۲: روی لینوکس VPS با PM2</span>
          </button>

          <button
            onClick={() => setActiveTab('nginx')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'nginx'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>پیکربندی Nginx و گواهی SSL (ضروری برای میکروفون)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* SSL Notice Warning */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 text-xs text-amber-200">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-100">نکته بسیار مهم در مورد میکروفون مرورگر:</span>
              <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                مرورگرهای وب (Chrome, Safari, Firefox) به دلایل امنیتی اجازه دسترسی به میکروفون (<code className="font-mono bg-amber-900/60 px-1 rounded">getUserMedia</code>) را فقط روی پروتکل امن <strong>HTTPS</strong> یا <code className="font-mono bg-amber-900/60 px-1 rounded">localhost</code> می‌دهند. بنابراین حتماً باید برای دامنه خود SSL رایگان (مثل Let&apos;s Encrypt یا Cloudflare) فعال کنید.
              </p>
            </div>
          </div>

          {activeTab === 'docker' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-100 text-sm mb-1">
                  استقرار سریع با Docker (فایل‌های Dockerfile و docker-compose.yml در پروژه موجود هستند):
                </h4>
                <p className="text-xs text-slate-400">
                  این ساده‌ترین روش است؛ تمام پکیج‌ها، بیلد Vite و سرور به صورت ایزوله اجرا می‌شوند.
                </p>
              </div>

              <div className="relative">
                <button
                  onClick={() => copyText('docker', dockerCommands)}
                  className="absolute left-3 top-3 px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors z-10"
                >
                  {copiedKey === 'docker' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی دستورات</span>
                    </>
                  )}
                </button>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto dir-ltr text-left">
                  {dockerCommands}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'vps' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-100 text-sm mb-1">
                  استقرار مستقیم روی سرور اوبونتو / دبیان با PM2:
                </h4>
                <p className="text-xs text-slate-400">
                  فایل <code className="font-mono text-emerald-400">ecosystem.config.cjs</code> در ریشه پروژه قرار دارد و فرآیند را مدیریت می‌کند.
                </p>
              </div>

              <div className="relative">
                <button
                  onClick={() => copyText('vps', vpsCommands)}
                  className="absolute left-3 top-3 px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors z-10"
                >
                  {copiedKey === 'vps' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی دستورات</span>
                    </>
                  )}
                </button>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto dir-ltr text-left">
                  {vpsCommands}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'nginx' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-100 text-sm mb-1">
                  پیکربندی Nginx Reverse Proxy با هندلینگ WebSocket و SSL:
                </h4>
                <p className="text-xs text-slate-400">
                  فایل نمونه در پروژه با نام <code className="font-mono text-indigo-400">nginx.conf.example</code> ذخیره شده است.
                </p>
              </div>

              <div className="relative">
                <button
                  onClick={() => copyText('nginx', nginxSnippet)}
                  className="absolute left-3 top-3 px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors z-10"
                >
                  {copiedKey === 'nginx' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی کانفیگ Nginx</span>
                    </>
                  )}
                </button>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 overflow-x-auto dir-ltr text-left">
                  {nginxSnippet}
                </pre>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-white">دریافت آسان گواهی SSL رایگان با Certbot:</span>
                <p className="font-mono text-cyan-400 dir-ltr text-left">
                  sudo apt install certbot python3-certbot-nginx<br />
                  sudo certbot --nginx -d voice.yourdomain.com
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
