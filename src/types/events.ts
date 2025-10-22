/**
 * Event Bus Type Definitions
 */

export type ISO8601DateTime = string;

// Audio Input Event
export interface AudioInEvent {
  session_id: string;
  chunk: string; // Base64-encoded
  timestamp: ISO8601DateTime;
  sample_rate?: number;
  channels?: number;
}

// STT Partial Result Event
export interface SttPartialEvent {
  session_id: string;
  text: string;
  confidence: number;
  timestamp?: ISO8601DateTime;
}

// STT Final Result Event
export interface SttFinalEvent {
  session_id: string;
  text: string;
  confidence: number;
  duration: number;
  timestamp?: ISO8601DateTime;
  alternatives?: Array<{ text: string; confidence: number }>;
}

// NLU Intent Event
export interface NluIntentEvent {
  session_id: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  timestamp?: ISO8601DateTime;
  source_text?: string;
}

// MCP Call Event
export interface McpCallEvent {
  call_id: string;
  session_id?: string;
  capability: string;
  args: Record<string, any>;
  timeout?: number;
  timestamp?: ISO8601DateTime;
  priority?: 'low' | 'normal' | 'high';
}

// MCP Result Event
export interface McpResultEvent {
  call_id: string;
  status: 'success' | 'error' | 'timeout';
  result?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp?: ISO8601DateTime;
  duration?: number;
}

// TTS Say Event
export interface TalkSayEvent {
  session_id: string;
  text: string;
  voice?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  speaking_rate?: number;
  pitch?: number;
  timestamp?: ISO8601DateTime;
  interruptible?: boolean;
}

// Policy Confirm Event
export interface PolicyConfirmEvent {
  session_id: string;
  confirm_id?: string;
  action: string;
  args: Record<string, any>;
  timeout?: number;
  prompt?: string;
  timestamp?: ISO8601DateTime;
}

// Policy Choice Event
export interface PolicyChoiceEvent {
  session_id: string;
  confirm_id?: string;
  choice: 'confirm' | 'cancel' | 'timeout';
  timestamp: ISO8601DateTime;
  voice_input?: string;
}

// State Update Event
export type SessionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'confirming' | 'error' | 'closed';

export interface StateUpdateEvent {
  session_id: string;
  state: SessionState;
  context?: {
    turn_count?: number;
    last_intent?: string;
    references?: Record<string, any>;
    pending_actions?: string[];
  };
  timestamp?: ISO8601DateTime;
  metadata?: Record<string, any>;
}

// Event Topic Type Union
export type EventTopic =
  | 'audio.in'
  | 'stt.partial'
  | 'stt.final'
  | 'nlu.intent'
  | 'mcp.call'
  | 'mcp.result'
  | 'talk.say'
  | 'policy.confirm'
  | 'policy.choice'
  | 'state.update';

// Event Payload Type Mapping
export interface EventPayloadMap {
  'audio.in': AudioInEvent;
  'stt.partial': SttPartialEvent;
  'stt.final': SttFinalEvent;
  'nlu.intent': NluIntentEvent;
  'mcp.call': McpCallEvent;
  'mcp.result': McpResultEvent;
  'talk.say': TalkSayEvent;
  'policy.confirm': PolicyConfirmEvent;
  'policy.choice': PolicyChoiceEvent;
  'state.update': StateUpdateEvent;
}

export type EventPayload<T extends EventTopic> = EventPayloadMap[T];
