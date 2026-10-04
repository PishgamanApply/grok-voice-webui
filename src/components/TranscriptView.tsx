import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../types/grok';
import { Bot, User, Copy, Check, Trash2, Volume2, Sparkles } from 'lucide-react';

interface TranscriptViewProps {
  messages: ChatMessage[];
  streamingTranscript: string;
  onClear: () => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  messages,
  streamingTranscript,
  onClear,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingTranscript]);

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasContent = messages.length > 0 || streamingTranscript.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-200">متن گفتگو (Transcript)</span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
            {messages.length} پیام
          </span>
        </div>

        {hasContent && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 rounded-md hover:bg-slate-800"
            title="پاک کردن متن گفتگو"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>پاکسازی</span>
          </button>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasContent && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-500">
            <Bot className="w-12 h-12 text-slate-600 mb-3 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-400">هنوز صحبتی انجام نشده است</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              میکروفون را روشن کنید و شروع به صحبت کنید، یا از کادر پایین متن بفرستید تا پاسخ صوتی ایجنت را بشنوید.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 text-sm ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  isUser
                    ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 rounded-tr-none'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-100 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {isUser ? 'شما' : 'عامل Grok Voice'}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>

                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyText(msg.id, msg.text)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 text-xs flex items-center gap-1"
                    title="کپی متن"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Transcript */}
        {streamingTranscript && (
          <div className="flex gap-3 text-sm flex-row">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-none px-4 py-3 bg-purple-950/30 border border-purple-500/40 text-purple-100">
              <div className="flex items-center gap-2 mb-1 text-[11px] text-purple-300">
                <span className="font-semibold">عامل Grok Voice (در حال تکلم...)</span>
                <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              </div>
              <p className="leading-relaxed whitespace-pre-wrap break-words">
                {streamingTranscript}
                <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
