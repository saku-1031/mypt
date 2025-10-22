/**
 * Orchestrator - Manages MCP capability calls and coordination
 */

import { EventBus } from './event-bus.js';
import { SessionManager } from './session-manager.js';
import { NluIntentEvent, McpCallEvent, McpResultEvent } from '../types/events.js';
import { CapabilityHandler } from '../types/mcp.js';

interface CapabilityRegistration {
  name: string;
  handler: CapabilityHandler;
  timeout?: number;
}

export class Orchestrator {
  private capabilities: Map<string, CapabilityRegistration> = new Map();
  private pendingCalls: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private callHistory: Array<{ call_id: string; capability: string; status: string; timestamp: string }> = [];

  constructor(
    private eventBus: EventBus,
    private sessionManager: SessionManager
  ) {
    this.setupEventListeners();
  }

  /**
   * Register a capability handler
   */
  registerCapability(name: string, handler: CapabilityHandler, timeout = 2000): void {
    this.capabilities.set(name, { name, handler, timeout });
    console.log(`[Orchestrator] Registered capability: ${name}`);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to intent events
    this.eventBus.on('nlu.intent', async (event) => {
      await this.handleIntent(event);
    });

    // Listen to MCP call events
    this.eventBus.on('mcp.call', async (event) => {
      await this.handleMcpCall(event);
    });
  }

  /**
   * Handle intent event
   */
  private async handleIntent(event: NluIntentEvent): Promise<void> {
    console.log(`[Orchestrator] Handling intent: ${event.intent}`);

    const session = this.sessionManager.getSession(event.session_id);
    if (!session) {
      console.warn(`[Orchestrator] Session not found: ${event.session_id}`);
      return;
    }

    // Update session state
    this.sessionManager.updateState(event.session_id, 'processing', {
      last_intent: event.intent,
    });

    // Create MCP call
    const callId = this.generateCallId();
    const mcpCallEvent: McpCallEvent = {
      call_id: callId,
      session_id: event.session_id,
      capability: event.intent,
      args: event.entities,
      timeout: 2000,
      priority: 'normal',
      timestamp: new Date().toISOString(),
    };

    // Emit MCP call event
    await this.eventBus.emit('mcp.call', mcpCallEvent);
  }

  /**
   * Handle MCP call event
   */
  private async handleMcpCall(event: McpCallEvent): Promise<void> {
    const capability = this.capabilities.get(event.capability);

    if (!capability) {
      console.error(`[Orchestrator] Capability not found: ${event.capability}`);
      await this.emitError(event.call_id, 'CAPABILITY_NOT_FOUND', `Capability ${event.capability} not found`);
      return;
    }

    const startTime = Date.now();

    try {
      console.log(`[Orchestrator] Executing capability: ${event.capability}`, event.args);

      // Execute capability with timeout
      const result = await Promise.race([
        capability.handler(event.args),
        this.createTimeout(event.timeout || capability.timeout || 2000),
      ]);

      const duration = Date.now() - startTime;

      // Emit success result
      const resultEvent: McpResultEvent = {
        call_id: event.call_id,
        status: 'success',
        result,
        duration,
        timestamp: new Date().toISOString(),
      };

      await this.eventBus.emit('mcp.result', resultEvent);
      this.logCall(event.call_id, event.capability, 'success');

      // Store result as reference
      if (event.session_id) {
        this.sessionManager.addReference(event.session_id, 'last_result', result);
        this.sessionManager.addReference(event.session_id, `${event.capability}_result`, result);
      }

      // Generate response
      await this.generateResponse(event.session_id!, event.capability, result);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[Orchestrator] Capability error:`, error);

      const resultEvent: McpResultEvent = {
        call_id: event.call_id,
        status: error.message === 'TIMEOUT' ? 'timeout' : 'error',
        error: {
          code: error.code || 'EXECUTION_ERROR',
          message: error.message || 'Unknown error',
          details: error.details,
        },
        duration,
        timestamp: new Date().toISOString(),
      };

      await this.eventBus.emit('mcp.result', resultEvent);
      this.logCall(event.call_id, event.capability, resultEvent.status);

      // Generate error response
      await this.generateErrorResponse(event.session_id!, error.message);
    }
  }

  /**
   * Generate natural language response
   */
  private async generateResponse(sessionId: string, capability: string, result: any): Promise<void> {
    let responseText = '';

    // Generate response based on capability
    if (capability === 'calendar.add') {
      const start = new Date(result.start);
      const end = new Date(result.end);
      responseText = `${start.getMonth() + 1}月${start.getDate()}日 ${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}から${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}まで、予定を登録したよ。`;
    } else if (capability === 'calendar.update') {
      responseText = '予定を変更したよ。';
    } else if (capability === 'memo.create') {
      responseText = 'メモを作成したよ。';
    } else if (capability === 'memo.search') {
      const count = result.memos?.length || 0;
      responseText = `${count}件のメモが見つかったよ。`;
    } else if (capability === 'task.add') {
      responseText = `タスク「${result.title}」を追加したよ。`;
    } else if (capability === 'task.list') {
      const count = result.tasks?.length || 0;
      responseText = `${count}件のタスクがあるよ。`;
    } else {
      responseText = 'やっといたよ。';
    }

    // Update session state
    this.sessionManager.updateState(sessionId, 'speaking');

    // Emit TTS event
    await this.eventBus.emit('talk.say', {
      session_id: sessionId,
      text: responseText,
      voice: 'ja-JP-Neural2-B',
      priority: 'normal',
      interruptible: true,
      timestamp: new Date().toISOString(),
    });

    // After speaking, return to idle
    setTimeout(() => {
      this.sessionManager.updateState(sessionId, 'idle');
      this.sessionManager.incrementTurn(sessionId);
    }, 1000);
  }

  /**
   * Generate error response
   */
  private async generateErrorResponse(sessionId: string, error: string): Promise<void> {
    const responseText = `エラーが発生しました: ${error}`;

    await this.eventBus.emit('talk.say', {
      session_id: sessionId,
      text: responseText,
      voice: 'ja-JP-Neural2-B',
      priority: 'normal',
      interruptible: true,
      timestamp: new Date().toISOString(),
    });

    this.sessionManager.updateState(sessionId, 'error');
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), ms);
    });
  }

  /**
   * Emit error result
   */
  private async emitError(callId: string, code: string, message: string): Promise<void> {
    const resultEvent: McpResultEvent = {
      call_id: callId,
      status: 'error',
      error: { code, message },
      timestamp: new Date().toISOString(),
    };

    await this.eventBus.emit('mcp.result', resultEvent);
  }

  /**
   * Log call history
   */
  private logCall(callId: string, capability: string, status: string): void {
    this.callHistory.push({
      call_id: callId,
      capability,
      status,
      timestamp: new Date().toISOString(),
    });

    // Keep history size manageable
    if (this.callHistory.length > 100) {
      this.callHistory.shift();
    }
  }

  /**
   * Generate call ID
   */
  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get call history
   */
  getCallHistory(limit?: number): typeof this.callHistory {
    return limit ? this.callHistory.slice(-limit) : [...this.callHistory];
  }

  /**
   * Get registered capabilities
   */
  getCapabilities(): string[] {
    return Array.from(this.capabilities.keys());
  }
}
