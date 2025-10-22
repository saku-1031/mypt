/**
 * Mock ASR (Automatic Speech Recognition) Interface
 * Simulates streaming ASR with partial and final results
 */

import { EventBus } from '../core/event-bus.js';
import { SttPartialEvent, SttFinalEvent } from '../types/events.js';

export class MockASR {
  constructor(private eventBus: EventBus) {}

  /**
   * Simulate speech recognition from text
   * In production, this would process actual audio input
   */
  async recognizeText(sessionId: string, text: string): Promise<void> {
    console.log(`[MockASR] Recognizing: "${text}"`);

    // Simulate partial results (streaming)
    const words = text.split(' ');
    let partial = '';

    for (let i = 0; i < words.length; i++) {
      partial += (i > 0 ? ' ' : '') + words[i];

      // Emit partial result
      const partialEvent: SttPartialEvent = {
        session_id: sessionId,
        text: partial,
        confidence: 0.7 + (i / words.length) * 0.2, // Increasing confidence
        timestamp: new Date().toISOString(),
      };

      await this.eventBus.emit('stt.partial', partialEvent);

      // Simulate processing delay
      await this.delay(100);
    }

    // Emit final result
    const finalEvent: SttFinalEvent = {
      session_id: sessionId,
      text: text,
      confidence: 0.95,
      duration: words.length * 0.3, // Rough estimate
      timestamp: new Date().toISOString(),
    };

    await this.eventBus.emit('stt.final', finalEvent);

    console.log(`[MockASR] Recognition complete`);
  }

  /**
   * Simulate audio stream processing
   */
  async processAudioStream(sessionId: string, audioChunks: string[]): Promise<void> {
    // In production, this would process actual audio chunks
    console.log(`[MockASR] Processing ${audioChunks.length} audio chunks`);

    // For demo, just emit audio.in events
    for (const chunk of audioChunks) {
      await this.eventBus.emit('audio.in', {
        session_id: sessionId,
        chunk,
        timestamp: new Date().toISOString(),
        sample_rate: 16000,
        channels: 1,
      });
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
