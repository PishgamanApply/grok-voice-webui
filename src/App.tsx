/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGrokVoice } from './hooks/useGrokVoice';
import { VoiceOrb } from './components/VoiceOrb';
import { AudioVisualizerBar } from './components/AudioVisualizerBar';
import { TranscriptView } from './components/TranscriptView';
import { EventInspectorModal } from './components/EventInspectorModal';
import { ArchitectureGuideModal } from './components/ArchitectureGuideModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { AgentConfig, ServerConfigStatus } from './types/grok';
import {
  Mic,
  MicOff,
  Send,
  Radio,
  Settings,
  Terminal,
  BookOpen,
  VolumeX,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  const [serverStatus, setServerStatus] = useState<ServerConfigStatus | null>(null);
  const [config, setConfig] = useState<AgentConfig>({
    agentId: 'agent_zUSPneIFwL9LP1Kn',
    apiKey: '',
    mode: 'grok',
    autoListen: true,
    vadSensitivity: 0.03,
  });

  const [textInput, setTextInput] = useState('');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch server status on initial load
  useEffect(() => {
    fetch('/api/config-status')
      .then((r) => r.json())
      .then((data: ServerConfigStatus) => {
        setServerStatus(data);
        if (data.defaultAgentId) {
          setConfig((prev) => ({
            ...prev,
            agentId: prev.agentId || data.defaultAgentId,
            mode: data.hasEnvKey ? 'grok' : 'simulator',
          }));
        }
      })
      .catch((e) => console.error('Failed to fetch server status:', e));
  }, []);

  const {
    connectionStatus,
    agentState,
    messages,
    streamingTranscript,
    audioEnergy,
    logs,
    isMicActive,
    activeTarget,
    errorMessage,
    connect,
    disconnect,
    toggleMic,
    sendTextMessage,
    interruptAgent,
    clearMessages,
    clearLogs,
    clearError,
  } = useGrokVoice(config);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendTextMessage(textInput);
    setTextInput('');
  };

  const handlePromptClick = (text: string) => {
    sendTextMessage(text);
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base md:text-lg tracking-tight text-white">
                Grok Voice Agent
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                Web Voice Client
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Agent:</span>
              <span className="text-cyan-400 font-semibold">{config.agentId}</span>
            </div>
          </div>
        </div>

        {/* Center / Right status & action buttons */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Target Mode Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? activeTarget === 'xai'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-indigo-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300">
              {isConnected
                ? activeTarget === 'xai'
                  ? 'متصل به xAI Grok Live'
                  : 'شبیه‌ساز تست رابط (Simulator)'
                : 'قطع ارتباط'}
            </span>
          </div>

          {/* Architecture Guide Button */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 shadow-sm transition-all"
            title="راهنمای معماری و کد سرور برای وب"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">راهنمای معماری</span>
          </button>

          {/* WebSocket Inspector Button */}
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 shadow-sm transition-all relative"
            title="بازرس بسته‌های WebSocket"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">رویدادها</span>
            {logs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-[10px] flex items-center justify-center font-mono">
                {logs.length > 99 ? '99+' : logs.length}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            title="تنظیمات ایجنت"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Reconnect button */}
          <button
            onClick={connect}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            title="اتصال مجدد"
          >
            <RefreshCw className={`w-4 h-4 ${connectionStatus === 'connecting' ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Quick Info & Notice Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800/70 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            ایجنت فعال: <code className="text-cyan-300 font-mono">{config.agentId}</code>
            {' | '}
            پروتکل: <span className="text-slate-200">xAI Realtime Voice (Web Audio API + Node Relay)</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>چگونه این وب‌کلاینت را روی سرور خودتان اجرا کنید؟</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="bg-rose-950/60 border-b border-rose-800/80 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={clearError}
            className="text-rose-400 hover:text-rose-100 font-semibold px-2 py-0.5"
          >
            بستن
          </button>
        </div>
      )}

      {/* Main Grid: Left Orb + Controls, Right Transcript */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left / Voice Stage (7 columns on desktop) */}
        <section className="lg:col-span-7 flex flex-col justify-between bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl relative overflow-hidden">
          {/* Subtle background ambient mesh */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Voice Orb Area */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 relative z-10">
            <VoiceOrb
              state={agentState}
              audioEnergy={audioEnergy}
              isMuted={!isMicActive}
              onToggleMic={toggleMic}
              disabled={connectionStatus !== 'connected'}
            />

            {/* Live Audio Spectrum / Waveform */}
            <div className="w-full flex justify-center mt-2">
              <AudioVisualizerBar
                energy={audioEnergy}
                isActive={agentState === 'speaking' || agentState === 'listening'}
                activeColor={
                  agentState === 'speaking'
                    ? 'from-purple-500 to-cyan-400'
                    : 'from-emerald-400 to-teal-500'
                }
              />
            </div>

            {/* Quick Action Bar under Orb */}
            <div className="flex items-center gap-3 mt-4">
              {/* Push to talk / Toggle button */}
              <button
                type="button"
                onClick={toggleMic}
                disabled={connectionStatus !== 'connected'}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-lg transition-all ${
                  isMicActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 animate-pulse'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30'
                }`}
              >
                {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMicActive ? 'قطع میکروفون (ارسال صدا)' : 'روشن کردن میکروفون'}</span>
              </button>

              {/* Interrupt button (if agent is speaking) */}
              {agentState === 'speaking' && (
                <button
                  type="button"
                  onClick={interruptAgent}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-xs font-medium transition-colors"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>توقف صحبت ایجنت</span>
                </button>
              )}
            </div>
          </div>

          {/* Suggested Prompts Chips */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 z-10">
            <span className="text-[11px] text-slate-400 font-medium mb-2 block">
              پیشنهادات سریع برای شروع گفتگو:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                'سلام! لطفا خودت و قابلیت‌هایت را معرفی کن',
                'چطور به صورت بلادرنگ صوت تولید می‌کنی؟',
                'یک شوخی بامزه برایم بگو',
                'Tell me about Grok Voice API features',
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptClick(prompt)}
                  disabled={connectionStatus !== 'connected'}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-cyan-200 transition-colors text-right"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Text message input box */}
          <form onSubmit={handleSendText} className="mt-4 z-10">
            <div className="relative flex items-center">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="می‌توانید پیام متنی تایپ کنید تا ایجنت صوتی پاسخ دهد..."
                disabled={connectionStatus !== 'connected'}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 shadow-inner"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || connectionStatus !== 'connected'}
                className="absolute left-2 p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 disabled:hover:bg-cyan-600 transition-colors"
                title="ارسال پیام"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>

        {/* Right / Transcript Stage (5 columns on desktop) */}
        <section className="lg:col-span-5 h-[520px] lg:h-auto flex flex-col">
          <TranscriptView
            messages={messages}
            streamingTranscript={streamingTranscript}
            onClear={clearMessages}
          />
        </section>
      </main>

      {/* Modals & Drawers */}
      <EventInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        logs={logs}
        onClearLogs={clearLogs}
      />

      <ArchitectureGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        currentAgentId={config.agentId}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={setConfig}
        serverStatus={serverStatus}
        onReconnect={connect}
      />
    </div>
  );
}
