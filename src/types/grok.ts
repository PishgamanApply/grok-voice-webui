export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type ConnectionMode = 'grok' | 'simulator';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  isStreaming?: boolean;
  timestamp: number;
}

export interface WsEventLog {
  id: string;
  timestamp: string;
  direction: 'sent' | 'received';
  type: string;
  payload: any;
  summary?: string;
}

export interface AgentConfig {
  agentId: string;
  apiKey: string;
  mode: ConnectionMode;
  autoListen: boolean;
  vadSensitivity: number; // 0.01 - 0.1
  systemPrompt?: string;
}

export interface ServerConfigStatus {
  status: string;
  hasEnvKey: boolean;
  defaultAgentId: string;
  timestamp: string;
}
