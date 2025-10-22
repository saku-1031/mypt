/**
 * MCP Capability Type Definitions
 */

import { ISO8601DateTime } from './events.js';

// Calendar Types
export interface CalendarAddRequest {
  title: string;
  start: ISO8601DateTime;
  end: ISO8601DateTime;
  attendees?: string[];
  location?: string;
  description?: string;
}

export interface CalendarAddResponse {
  event_id: string;
  start: ISO8601DateTime;
  end: ISO8601DateTime;
  status: 'confirmed' | 'tentative';
}

// Memo Types
export interface MemoCreateRequest {
  content: string;
  tags?: string[];
  format?: 'text' | 'markdown';
}

export interface MemoCreateResponse {
  memo_id: string;
  content: string;
  created_at: ISO8601DateTime;
  tags: string[];
}

export interface MemoSearchRequest {
  query: string;
  tags?: string[];
  limit?: number;
}

export interface MemoSearchResponse {
  memos: Array<{
    memo_id: string;
    content: string;
    created_at: ISO8601DateTime;
    tags: string[];
    score: number;
  }>;
}

// Task Types
export interface TaskAddRequest {
  title: string;
  due?: ISO8601DateTime;
  priority?: 'low' | 'medium' | 'high';
  description?: string;
  link?: string;
}

export interface TaskAddResponse {
  task_id: string;
  title: string;
  due?: ISO8601DateTime;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
}

export interface TaskListRequest {
  status?: 'pending' | 'completed' | 'all';
  limit?: number;
}

export interface TaskListResponse {
  tasks: Array<{
    task_id: string;
    title: string;
    due?: ISO8601DateTime;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'completed';
  }>;
}

// MCP Capability Handler Type
export type CapabilityHandler<TRequest = any, TResponse = any> = (
  args: TRequest
) => Promise<TResponse>;
