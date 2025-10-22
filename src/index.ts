/**
 * Voice MCP Hub - Main Entry Point
 */

import { EventBus, eventBus } from './core/event-bus.js';
import { SessionManager } from './core/session-manager.js';
import { NLU } from './core/nlu.js';
import { Orchestrator } from './core/orchestrator.js';
import { MockASR } from './utils/mock-asr.js';
import { MockTTS } from './utils/mock-tts.js';

// Import capabilities
import { calendarAdd, calendarUpdate, calendarList } from './capabilities/calendar.js';
import { memoCreate, memoSearch, memoAppend } from './capabilities/memo.js';
import { taskAdd, taskComplete, taskList } from './capabilities/task.js';

export class VoiceMCPHub {
  private eventBus: EventBus;
  private sessionManager: SessionManager;
  private nlu: NLU;
  private orchestrator: Orchestrator;
  private mockASR: MockASR;
  private mockTTS: MockTTS;

  constructor() {
    console.log('[VoiceMCPHub] Initializing...');

    // Initialize core components
    this.eventBus = eventBus;
    this.sessionManager = new SessionManager(this.eventBus);
    this.nlu = new NLU(this.eventBus);
    this.orchestrator = new Orchestrator(this.eventBus, this.sessionManager);

    // Initialize mock interfaces
    this.mockASR = new MockASR(this.eventBus);
    this.mockTTS = new MockTTS(this.eventBus);

    // Register capabilities
    this.registerCapabilities();

    console.log('[VoiceMCPHub] Initialization complete');
  }

  /**
   * Register all MCP capabilities
   */
  private registerCapabilities(): void {
    // Calendar capabilities
    this.orchestrator.registerCapability('calendar.add', calendarAdd);
    this.orchestrator.registerCapability('calendar.update', calendarUpdate);
    this.orchestrator.registerCapability('calendar.list', calendarList);

    // Memo capabilities
    this.orchestrator.registerCapability('memo.create', memoCreate);
    this.orchestrator.registerCapability('memo.search', memoSearch);
    this.orchestrator.registerCapability('memo.append', memoAppend);

    // Task capabilities
    this.orchestrator.registerCapability('task.add', taskAdd);
    this.orchestrator.registerCapability('task.complete', taskComplete);
    this.orchestrator.registerCapability('task.list', taskList);

    console.log('[VoiceMCPHub] Registered capabilities:', this.orchestrator.getCapabilities());
  }

  /**
   * Process user utterance
   */
  async processUtterance(sessionId: string, text: string): Promise<void> {
    console.log(`\n[VoiceMCPHub] Processing utterance for session ${sessionId}: "${text}"\n`);

    // Update session state to listening
    this.sessionManager.updateState(sessionId, 'listening');

    // Simulate ASR processing
    await this.mockASR.recognizeText(sessionId, text);

    // NLU and orchestrator will handle the rest via events
  }

  /**
   * Create a new session
   */
  createSession(sessionId?: string) {
    return this.sessionManager.createSession(sessionId);
  }

  /**
   * Get session
   */
  getSession(sessionId: string) {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Close session
   */
  closeSession(sessionId: string) {
    this.sessionManager.closeSession(sessionId);
  }

  /**
   * Get event bus (for monitoring)
   */
  getEventBus() {
    return this.eventBus;
  }

  /**
   * Get orchestrator (for monitoring)
   */
  getOrchestrator() {
    return this.orchestrator;
  }
}

// Export singleton instance
export const voiceHub = new VoiceMCPHub();

export default voiceHub;
