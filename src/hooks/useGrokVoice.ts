import { useState, useEffect, useRef, useCallback } from 'react';
import { AgentConfig, AgentState, ChatMessage, ConnectionStatus, WsEventLog } from '../types/grok';
import { AudioRecorder } from '../lib/audioRecorder';
import { AudioPlayer } from '../lib/audioPlayer';

export function useGrokVoice(config: AgentConfig) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingTranscript, setStreamingTranscript] = useState<string>('');
  const [audioEnergy, setAudioEnergy] = useState<number>(0);
  const [logs, setLogs] = useState<WsEventLog[]>([]);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [activeTarget, setActiveTarget] = useState<'xai' | 'simulator' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const currentStreamingTextRef = useRef<string>('');
  const configRef = useRef<AgentConfig>(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const addLog = useCallback((direction: 'sent' | 'received', type: string, payload: any, summary?: string) => {
    const newLog: WsEventLog = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour12: false }),
      direction,
      type,
      payload,
      summary: summary || (typeof payload === 'object' ? JSON.stringify(payload).substring(0, 80) : String(payload)),
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 199)]);
  }, []);

  // Initialize AudioPlayer
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer((rms) => {
      if (agentState === 'speaking') {
        setAudioEnergy(rms);
      }
    });

    audioRecorderRef.current = new AudioRecorder();

    return () => {
      audioPlayerRef.current?.close();
      audioRecorderRef.current?.stop();
    };
  }, []);

  // Connect WebSocket to backend relay
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');
    setErrorMessage(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = new URL(`${protocol}//${host}/api/grok-ws`);

    if (configRef.current.agentId) {
      url.searchParams.set('agent_id', configRef.current.agentId);
    }
    if (configRef.current.apiKey) {
      url.searchParams.set('api_key', configRef.current.apiKey);
    }
    url.searchParams.set('mode', configRef.current.mode);

    try {
      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        addLog('sent', 'websocket.open', { url: url.toString() }, 'اتصال به پروکسی برقرار شد');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerEvent(data);
        } catch (err: any) {
          console.error('[Grok Client] Error parsing incoming JSON:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[Grok Client] WebSocket error:', err);
        setConnectionStatus('error');
        setErrorMessage('خطا در اتصال به سرور واسط WebSocket.');
      };

      ws.onclose = (e) => {
        console.log('[Grok Client] WebSocket closed:', e.code, e.reason);
        setConnectionStatus('disconnected');
        setAgentState('idle');
        setIsMicActive(false);
        audioRecorderRef.current?.stop();
        audioPlayerRef.current?.interrupt();
        addLog('received', 'websocket.close', { code: e.code, reason: e.reason }, 'اتصال وب‌سوکت قطع شد');
      };
    } catch (err: any) {
      setConnectionStatus('error');
      setErrorMessage(`امکان برقراری اتصال وجود ندارد: ${err.message}`);
    }
  }, [addLog]);

  // Handle events received from Grok / Gateway
  const handleServerEvent = useCallback((event: any) => {
    const eventType = event.type || 'unknown';

    if (eventType === 'response.output_audio.delta') {
      addLog('received', eventType, { deltaLength: event.delta?.length || 0 }, `چانک صوتی (${event.delta?.length || 0} بایت)`);
    } else {
      addLog('received', eventType, event, event.notice || event.summary);
    }

    switch (eventType) {
      case 'gateway.connected':
        setActiveTarget(event.target);
        if (event.target === 'simulator') {
          // Simulator active notification
        }
        break;

      case 'session.created':
        // Ready for conversation
        setAgentState('idle');
        break;

      case 'response.created':
        setAgentState('thinking');
        currentStreamingTextRef.current = '';
        setStreamingTranscript('');
        break;

      case 'response.output_audio_transcript.delta':
        if (event.delta) {
          currentStreamingTextRef.current += event.delta;
          setStreamingTranscript(currentStreamingTextRef.current);
          setAgentState('speaking');
        }
        break;

      case 'response.output_audio.delta':
        if (event.delta) {
          setAgentState('speaking');
          audioPlayerRef.current?.playChunk(event.delta);
        }
        break;

      case 'response.done':
        const finalText = currentStreamingTextRef.current.trim();
        if (finalText) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}_assistant`,
              role: 'assistant',
              text: finalText,
              timestamp: Date.now(),
            },
          ]);
        }
        currentStreamingTextRef.current = '';
        setStreamingTranscript('');
        setAgentState('idle');
        setAudioEnergy(0);

        // If auto-listen is enabled, turn mic back on for hands-free conversational loop
        if (configRef.current.autoListen) {
          setTimeout(() => {
            startListening();
          }, 350);
        }
        break;

      case 'error':
        setErrorMessage(event.error?.message || 'خطای سرور xAI Realtime');
        setAgentState('idle');
        break;

      default:
        break;
    }
  }, [addLog]);

  // Send JSON event to WebSocket
  const sendEvent = useCallback((event: any, summary?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[Grok Client] Cannot send event: WebSocket is not open');
      return;
    }
    const jsonStr = JSON.stringify(event);
    wsRef.current.send(jsonStr);

    if (event.type === 'input_audio_buffer.append') {
      addLog('sent', event.type, { audioLength: event.audio?.length || 0 }, `ارسال چانک میکروفون (${event.audio?.length || 0} بایت)`);
    } else {
      addLog('sent', event.type, event, summary);
    }
  }, [addLog]);

  // Start microphone listening
  const startListening = useCallback(async () => {
    if (agentState === 'speaking') {
      // Interruption!
      interruptAgent();
    }

    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder();
      }

      await audioRecorderRef.current.start(
        (base64Chunk) => {
          sendEvent({
            type: 'input_audio_buffer.append',
            audio: base64Chunk,
          });
        },
        (rms) => {
          setAudioEnergy(rms);
        }
      );

      setIsMicActive(true);
      setAgentState('listening');
    } catch (err: any) {
      console.error('[Grok Client] Error accessing microphone:', err);
      setErrorMessage('دسترسی به میکروفون امکان‌پذیر نیست. لطفاً اجازه دسترسی به میکروفون را در مرورگر تایید کنید.');
      setIsMicActive(false);
      setAgentState('idle');
    }
  }, [agentState, sendEvent]);

  // Stop microphone and trigger agent response
  const stopListening = useCallback(() => {
    if (audioRecorderRef.current?.active) {
      audioRecorderRef.current.stop();
    }
    setIsMicActive(false);
    setAudioEnergy(0);

    // Commit audio buffer and request response
    sendEvent({ type: 'input_audio_buffer.commit' }, 'تکمیل صدای ورودی کاربر');
    sendEvent({ type: 'response.create' }, 'درخواست پاسخ صوتی از ایجنت');
    setAgentState('thinking');
  }, [sendEvent]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (isMicActive) {
      stopListening();
    } else {
      startListening();
    }
  }, [isMicActive, startListening, stopListening]);

  // Send a text message
  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    if (agentState === 'speaking') {
      interruptAgent();
    }

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        text: text.trim(),
        timestamp: Date.now(),
      },
    ]);

    // Send item create and response create
    sendEvent(
      {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: text.trim() }],
        },
      },
      `پیام متنی: ${text.trim().substring(0, 40)}`
    );

    sendEvent({ type: 'response.create' }, 'درخواست پاسخ به پیام متنی');
    setAgentState('thinking');
  }, [agentState, sendEvent]);

  // Interruption
  const interruptAgent = useCallback(() => {
    audioPlayerRef.current?.interrupt();
    sendEvent({ type: 'response.cancel' }, 'توقف و قطع پاسخ ایجنت (Interruption)');
    setAgentState('idle');
    setAudioEnergy(0);
  }, [sendEvent]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (audioRecorderRef.current?.active) {
      audioRecorderRef.current.stop();
    }
    audioPlayerRef.current?.interrupt();
    setIsMicActive(false);
    setAgentState('idle');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingTranscript('');
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
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
    startListening,
    stopListening,
    sendTextMessage,
    interruptAgent,
    clearMessages,
    clearLogs,
    clearError: () => setErrorMessage(null),
  };
}
