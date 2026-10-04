import React, { useState } from 'react';
import { WsEventLog } from '../types/grok';
import { Terminal, X, ArrowUpRight, ArrowDownLeft, Trash2, Copy, Check, Eye } from 'lucide-react';

interface EventInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WsEventLog[];
  onClearLogs: () => void;
}

export const EventInspectorModal: React.FC<EventInspectorModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [selectedLog, setSelectedLog] = useState<WsEventLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'audio_omitted' | 'sent' | 'received'>('audio_omitted');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filter === 'sent') return log.direction === 'sent';
    if (filter === 'received') return log.direction === 'received';
    if (filter === 'audio_omitted') {
      return (
        log.type !== 'response.output_audio.delta' &&
        log.type !== 'input_audio_buffer.append'
      );
    }
    return true;
  });

  const copyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-base">بازرس رویدادهای زنده WebSocket (Grok Protocol Inspector)</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {logs.length} رویداد
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearLogs}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>پاکسازی لاگ‌ها</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-950/60 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">فیلتر:</span>
            <button
              onClick={() => setFilter('audio_omitted')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'audio_omitted'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              رویدادهای متنی و کنترلی (بدون چانک‌های سنگین صوت)
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              همه ({logs.length})
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'sent'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              ارسال شده (Client)
            </button>
            <button
              onClick={() => setFilter('received')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'received'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              دریافت شده (Server)
            </button>
          </div>
        </div>

        {/* Main Content Split Pane */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-800 overflow-hidden">
          {/* Logs List */}
          <div className="h-full overflow-y-auto p-4 space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                هیچ رویدادی با این فیلتر ثبت نشده است
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSent = log.direction === 'sent';
                const isSelected = selectedLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-sm'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-mono">
                        {isSent ? (
                          <span className="flex items-center gap-1 text-cyan-400">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>CLIENT &rarr;</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-purple-400">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>&larr; SERVER</span>
                          </span>
                        )}
                        <span className="font-semibold text-slate-100">{log.type}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                    </div>

                    {log.summary && (
                      <div className="text-[11px] text-slate-400 truncate dir-ltr text-left font-mono">
                        {log.summary}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Log Details Viewer */}
          <div className="h-full overflow-y-auto p-4 flex flex-col bg-slate-950/80">
            {selectedLog ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-300 font-mono">
                      {selectedLog.type}
                    </h4>
                    <span className="text-xs text-slate-500">
                      جهت: {selectedLog.direction === 'sent' ? 'کلاینت به سرور' : 'سرور به کلاینت'} | زمان: {selectedLog.timestamp}
                    </span>
                  </div>

                  <button
                    onClick={() => copyJson(selectedLog.payload)}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>کپی شد!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-cyan-200 overflow-auto dir-ltr text-left">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <Eye className="w-8 h-8 mb-2 opacity-50" />
                <span>برای مشاهده جزئیات JSON، یک رویداد را از لیست سمت راست انتخاب کنید</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
