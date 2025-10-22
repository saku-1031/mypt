/**
 * Memo MCP Capability Implementation
 */

import {
  MemoCreateRequest,
  MemoCreateResponse,
  MemoSearchRequest,
  MemoSearchResponse,
} from '../types/mcp.js';

// In-memory storage for demo
const memos: Map<string, any> = new Map();
let memoIdCounter = 1;

/**
 * Create memo
 */
export async function memoCreate(args: MemoCreateRequest): Promise<MemoCreateResponse> {
  console.log('[memo.create] Creating memo:', args);

  const memoId = `memo_${memoIdCounter++}`;
  const memo = {
    memo_id: memoId,
    content: args.content,
    tags: args.tags || [],
    format: args.format || 'text',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memos.set(memoId, memo);

  console.log('[memo.create] Memo created:', memoId);

  return {
    memo_id: memoId,
    content: memo.content,
    created_at: memo.created_at,
    tags: memo.tags,
  };
}

/**
 * Search memos
 */
export async function memoSearch(args: MemoSearchRequest): Promise<MemoSearchResponse> {
  console.log('[memo.search] Searching memos:', args);

  const results = Array.from(memos.values())
    .filter((memo) => {
      // Simple text search
      const matchesQuery = !args.query || memo.content.includes(args.query);

      // Tag filter
      const matchesTags = !args.tags || args.tags.some((tag) => memo.tags.includes(tag));

      return matchesQuery && matchesTags;
    })
    .slice(0, args.limit || 10)
    .map((memo) => ({
      memo_id: memo.memo_id,
      content: memo.content,
      created_at: memo.created_at,
      tags: memo.tags,
      score: 0.9, // Mock score
    }));

  console.log('[memo.search] Found memos:', results.length);

  return { memos: results };
}

/**
 * Append to memo
 */
export async function memoAppend(args: any): Promise<any> {
  console.log('[memo.append] Appending to memo:', args);

  const memo = memos.get(args.memo_id);
  if (!memo) {
    throw new Error('Memo not found');
  }

  memo.content += '\n' + args.content;
  memo.updated_at = new Date().toISOString();

  console.log('[memo.append] Memo updated:', args.memo_id);

  return {
    memo_id: memo.memo_id,
    content: memo.content,
    updated_at: memo.updated_at,
  };
}
