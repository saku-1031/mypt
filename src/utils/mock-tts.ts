/**
 * Mock TTS (Text-to-Speech) Interface
 * Simulates streaming TTS output
 */

import { EventBus } from '../core/event-bus.js';
import { TalkSayEvent } from '../types/events.js';

export class MockTTS {
  private isPlaying = false;
  private currentSessionId?: string;

  constructor(private eventBus: EventBus) {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.eventBus.on('talk.say', async (event) => {
      await this.speak(event);
    });
  }

  /**
   * Speak text (simulated)
   */
  private async speak(event: TalkSayEvent): Promise<void> {
    console.log(`[MockTTS] Speaking: "${event.text}"`);

    this.isPlaying = true;
    this.currentSessionId = event.session_id;

    // Simulate TTS processing time (should be < 700ms)
    const startDelay = 300; // Simulated time to first audio
    await this.delay(startDelay);

    // Simulate speaking duration based on text length
    const speakingDuration = this.calculateSpeakingDuration(event.text, event.speaking_rate || 1.0);

    console.log(`[MockTTS] Playing audio (duration: ${speakingDuration}ms)`);

    // Simulate speaking
    await this.delay(speakingDuration);

    this.isPlaying = false;
    this.currentSessionId = undefined;

    console.log(`[MockTTS] Playback complete`);
  }

  /**
   * Stop current playback (for barge-in)
   */
  stop(): void {
    if (this.isPlaying) {
      console.log('[MockTTS] Stopping playback (barge-in)');
      this.isPlaying = false;
      this.currentSessionId = undefined;
    }
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Calculate speaking duration
   * Rough estimate: Japanese typical speaking rate ~5 mora/second
   */
  private calculateSpeakingDuration(text: string, speakingRate: number): number {
    const baseRateMs = 200; // ms per character (rough estimate for Japanese)
    const duration = (text.length * baseRateMs) / speakingRate;
    return Math.max(500, duration); // Minimum 500ms
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
