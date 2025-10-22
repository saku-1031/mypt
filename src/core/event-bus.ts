/**
 * In-Memory Event Bus Implementation
 */

import { EventTopic, EventPayload } from '../types/events.js';

type EventHandler<T extends EventTopic> = (payload: EventPayload<T>) => void | Promise<void>;

export class EventBus {
  private handlers: Map<EventTopic, Set<EventHandler<any>>> = new Map();
  private eventLog: Array<{ topic: EventTopic; payload: any; timestamp: string }> = [];
  private maxLogSize = 1000;

  /**
   * Subscribe to an event topic
   */
  on<T extends EventTopic>(topic: T, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(topic)?.delete(handler);
    };
  }

  /**
   * Subscribe to an event topic (one-time)
   */
  once<T extends EventTopic>(topic: T, handler: EventHandler<T>): void {
    const wrappedHandler: EventHandler<T> = async (payload) => {
      await handler(payload);
      this.handlers.get(topic)?.delete(wrappedHandler);
    };
    this.on(topic, wrappedHandler);
  }

  /**
   * Publish an event to a topic
   */
  async emit<T extends EventTopic>(topic: T, payload: EventPayload<T>): Promise<void> {
    // Add timestamp if not present
    const enrichedPayload = {
      ...payload,
      timestamp: (payload as any).timestamp || new Date().toISOString(),
    };

    // Log the event
    this.logEvent(topic, enrichedPayload);

    // Get handlers for this topic
    const handlers = this.handlers.get(topic);
    if (!handlers || handlers.size === 0) {
      console.debug(`[EventBus] No handlers for topic: ${topic}`);
      return;
    }

    // Execute all handlers
    const promises = Array.from(handlers).map((handler) =>
      Promise.resolve(handler(enrichedPayload)).catch((error) => {
        console.error(`[EventBus] Handler error for topic ${topic}:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Remove all handlers for a topic
   */
  off(topic: EventTopic): void {
    this.handlers.delete(topic);
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.eventLog = [];
  }

  /**
   * Get event log
   */
  getEventLog(limit?: number): Array<{ topic: EventTopic; payload: any; timestamp: string }> {
    return limit ? this.eventLog.slice(-limit) : [...this.eventLog];
  }

  /**
   * Log an event
   */
  private logEvent(topic: EventTopic, payload: any): void {
    this.eventLog.push({
      topic,
      payload,
      timestamp: new Date().toISOString(),
    });

    // Keep log size manageable
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
  }

  /**
   * Get handler count for a topic
   */
  getHandlerCount(topic: EventTopic): number {
    return this.handlers.get(topic)?.size || 0;
  }
}

// Singleton instance
export const eventBus = new EventBus();
