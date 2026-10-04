import React from 'react';
import { AgentConfig, ServerConfigStatus } from '../types/grok';
import { Settings, X, Key, Bot, Mic, ShieldAlert, CheckCircle, RotateCcw } from 'lucide-react';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: AgentConfig;
  onSaveConfig: (newConfig: AgentConfig) => void;
  serverStatus: ServerConfigStatus | null;
  onReconnect: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  serverStatus,
  onReconnect,
}) => {
  const [localConfig, setLocalConfig] = React.useState<AgentConfig>(config);

  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
    onReconnect();
  };

  const handleReset = () => {
    const defaultConfig: AgentConfig = {
      agentId: serverStatus?.defaultAgentId || 'agent_zUSPneIFwL9LP1Kn',
      apiKey: '',
      mode: serverStatus?.hasEnvKey ? 'grok' : 'simulator',
      autoListen: true,
      vadSensitivity: 0.03,
    };
    setLocalConfig(defaultConfig);
    onSaveConfig(defaultConfig);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-base">تنظیمات اتصال و عامل هوش مصنوعی</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Mode Switcher */}
          <div className="space-y-2">
            <label className="font-medium text-slate-300 block">حالت عملکرد اتصال:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalConfig({ ...localConfig, mode: 'grok' })}
                className={`p-3 rounded-xl border text-xs text-right transition-all ${
                  localConfig.mode === 'grok'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-500/50'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-white mb-1 flex items-center justify-between">
                  <span>اتصال زنده xAI Grok</span>
                  {localConfig.mode === 'grok' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <span>اتصال به WebSocket اصلی api.x.ai با Agent ID و API Key</span>
              </button>

              <button
                type="button"
                onClick={() => setLocalConfig({ ...localConfig, mode: 'simulator' })}
                className={`p-3 rounded-xl border text-xs text-right transition-all ${
                  localConfig.mode === 'simulator'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-white mb-1 flex items-center justify-between">
                  <span>حالت شبیه‌ساز (Simulator)</span>
                  {localConfig.mode === 'simulator' && <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <span>تست سریع میکروفون و صدا بدون نیاز به کلید xAI</span>
              </button>
            </div>
          </div>

          {/* Agent ID Field */}
          <div className="space-y-2">
            <label className="font-medium text-slate-300 flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>شناسه ایجنت (Agent ID):</span>
            </label>
            <input
              type="text"
              value={localConfig.agentId}
              onChange={(e) => setLocalConfig({ ...localConfig, agentId: e.target.value })}
              placeholder="agent_zUSPneIFwL9LP1Kn"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs font-mono dir-ltr text-left"
            />
            <p className="text-[11px] text-slate-400">
              شناسه عاملی که در کنسول توسعه‌دهندگان xAI ساخته‌اید. (پیش‌فرض ایجنت شما: <code className="text-cyan-300">agent_zUSPneIFwL9LP1Kn</code>)
            </p>
          </div>

          {/* API Key Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>کلید xAI API Key (اختیاری):</span>
              </label>
              {serverStatus?.hasEnvKey ? (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>در متغیرهای سرور یافت شد</span>
                </span>
              ) : (
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>کلید سرور تعریف نشده</span>
                </span>
              )}
            </div>
            <input
              type="password"
              value={localConfig.apiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
              placeholder={serverStatus?.hasEnvKey ? "استفاده از متغیر XAI_API_KEY سرور" : "xai-..."}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs font-mono dir-ltr text-left"
            />
            <p className="text-[11px] text-slate-400">
              این کلید فقط در طول نشست به صورت امن به پروکسی سرور ارسال می‌شود و در مرورگر ذخیره دائم نمی‌شود.
            </p>
          </div>

          {/* Interaction Mode */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="font-medium text-slate-300 flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>تنظیمات تعامل صوتی:</span>
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-slate-200">گوش دادن پیوسته (Hands-free Mode)</span>
                <p className="text-[11px] text-slate-400">پس از اتمام پاسخ ایجنت، میکروفون مجدداً برای گفتگوی شما فعال شود</p>
              </div>
              <input
                type="checkbox"
                checked={localConfig.autoListen}
                onChange={(e) => setLocalConfig({ ...localConfig, autoListen: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تنظیمات پیش‌فرض</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-lg shadow-cyan-900/30 transition-colors"
          >
            ذخیره و اتصال مجدد
          </button>
        </div>
      </div>
    </div>
  );
};
