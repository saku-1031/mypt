/**
 * Natural Language Understanding (NLU)
 * Simple pattern-matching based implementation
 */

import { EventBus } from './event-bus.js';
import { SttFinalEvent, NluIntentEvent } from '../types/events.js';

interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  entityExtractor?: (text: string, match: RegExpMatchArray) => Record<string, any>;
}

export class NLU {
  private intentPatterns: IntentPattern[] = [];

  constructor(private eventBus: EventBus) {
    this.initializePatterns();
    this.setupEventListeners();
  }

  /**
   * Initialize intent patterns
   */
  private initializePatterns(): void {
    // Calendar patterns
    this.intentPatterns.push({
      intent: 'calendar.add',
      patterns: [
        /(明日|今日|来週|(?:\d+)日)(?:の)?(\d+時)?.*?(?:予定|ミーティング|会議).*?入れて/,
        /(\d+時).*?(?:予定|ミーティング|会議).*?(?:追加|登録|入れて)/,
        /(?:予定|ミーティング|会議).*?(?:追加|作成|入れて)/,
      ],
      entityExtractor: this.extractCalendarEntities.bind(this),
    });

    this.intentPatterns.push({
      intent: 'calendar.update',
      patterns: [
        /(?:やっぱ|やはり).*?(\d+時).*?(?:変更|修正)/,
        /(?:予定|ミーティング).*?(\d+時).*?(?:変更|に変えて)/,
      ],
      entityExtractor: this.extractCalendarUpdateEntities.bind(this),
    });

    // Memo patterns
    this.intentPatterns.push({
      intent: 'memo.create',
      patterns: [
        /(?:これ|それ).*?メモ.*?(?:して|追加|作成)/,
        /メモ.*?(?:追加|作成|残して)/,
      ],
      entityExtractor: this.extractMemoEntities.bind(this),
    });

    this.intentPatterns.push({
      intent: 'memo.search',
      patterns: [
        /メモ.*?(?:検索|探して|見せて)/,
        /(.+).*?(?:に関する|について).*?メモ/,
      ],
      entityExtractor: this.extractMemoSearchEntities.bind(this),
    });

    // Task patterns
    this.intentPatterns.push({
      intent: 'task.add',
      patterns: [
        /(?:午後|明日|今日).*?(?:読む|やる).*?タスク.*?(?:入れて|追加)/,
        /タスク.*?(?:追加|作成|入れて)/,
        /(.+).*?(?:タスクに|TODO)/,
      ],
      entityExtractor: this.extractTaskEntities.bind(this),
    });

    this.intentPatterns.push({
      intent: 'task.list',
      patterns: [
        /タスク.*?(?:一覧|リスト|見せて|教えて)/,
        /(?:今日|明日).*?(?:タスク|やること)/,
      ],
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.eventBus.on('stt.final', async (event) => {
      await this.processUtterance(event);
    });
  }

  /**
   * Process utterance and extract intent
   */
  private async processUtterance(event: SttFinalEvent): Promise<void> {
    const text = event.text;
    console.log(`[NLU] Processing: "${text}"`);

    // Try to match against patterns
    for (const pattern of this.intentPatterns) {
      for (const regex of pattern.patterns) {
        const match = text.match(regex);
        if (match) {
          const entities = pattern.entityExtractor
            ? pattern.entityExtractor(text, match)
            : {};

          const intentEvent: NluIntentEvent = {
            session_id: event.session_id,
            intent: pattern.intent,
            entities,
            confidence: 0.85, // Fixed confidence for pattern matching
            source_text: text,
            timestamp: new Date().toISOString(),
          };

          console.log(`[NLU] Intent detected: ${pattern.intent}`, entities);
          await this.eventBus.emit('nlu.intent', intentEvent);
          return;
        }
      }
    }

    // No intent matched
    console.log('[NLU] No intent matched');
  }

  /**
   * Extract calendar entities
   */
  private extractCalendarEntities(text: string, match: RegExpMatchArray): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract date
    if (match[1]) {
      if (match[1] === '明日') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        entities.date = tomorrow.toISOString().split('T')[0];
      } else if (match[1] === '今日') {
        entities.date = new Date().toISOString().split('T')[0];
      } else if (match[1].includes('日')) {
        const day = parseInt(match[1]);
        const targetDate = new Date();
        targetDate.setDate(day);
        entities.date = targetDate.toISOString().split('T')[0];
      }
    }

    // Extract time
    if (match[2]) {
      const hour = parseInt(match[2]);
      entities.time = `${hour.toString().padStart(2, '0')}:00`;
    } else {
      // Default time
      entities.time = '10:00';
    }

    // Extract attendees (simple name extraction)
    const attendeeMatch = text.match(/(.+?)さん/);
    if (attendeeMatch) {
      entities.attendee = attendeeMatch[1];
    }

    // Extract duration
    const durationMatch = text.match(/(\d+)分/);
    if (durationMatch) {
      entities.duration = parseInt(durationMatch[1]);
    } else {
      entities.duration = 60; // Default 1 hour
    }

    // Extract title
    entities.title = text.replace(/入れて|追加|登録/g, '').trim();

    return entities;
  }

  /**
   * Extract calendar update entities
   */
  private extractCalendarUpdateEntities(text: string, match: RegExpMatchArray): Record<string, any> {
    const entities: Record<string, any> = {};

    if (match[1]) {
      const hour = parseInt(match[1]);
      entities.new_time = `${hour.toString().padStart(2, '0')}:00`;
    }

    return entities;
  }

  /**
   * Extract memo entities
   */
  private extractMemoEntities(text: string, match: RegExpMatchArray): Record<string, any> {
    const content = text.replace(/メモ.*?(?:して|追加|作成|残して)/, '').trim();
    return {
      content: content || text,
      format: 'text',
    };
  }

  /**
   * Extract memo search entities
   */
  private extractMemoSearchEntities(text: string, match: RegExpMatchArray): Record<string, any> {
    const query = text.replace(/メモ.*?(?:検索|探して|見せて)/, '').trim();
    return {
      query: query || match[1] || '',
    };
  }

  /**
   * Extract task entities
   */
  private extractTaskEntities(text: string, match: RegExpMatchArray): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract due time
    if (text.includes('午後')) {
      const today = new Date();
      today.setHours(15, 0, 0, 0);
      entities.due = today.toISOString();
    } else if (text.includes('明日')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      entities.due = tomorrow.toISOString();
    }

    // Extract title
    entities.title = text.replace(/タスク.*?(?:入れて|追加|作成)|午後|明日|今日/g, '').trim();

    // Extract priority
    if (text.includes('急ぎ') || text.includes('優先')) {
      entities.priority = 'high';
    } else {
      entities.priority = 'medium';
    }

    return entities;
  }
}
