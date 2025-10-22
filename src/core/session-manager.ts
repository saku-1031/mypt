/**
 * Session and State Management
 */

import { EventBus } from './event-bus.js';
import { SessionState, StateUpdateEvent } from '../types/events.js';

export interface SessionContext {
  turn_count: number;
  last_intent?: string;
  last_utterance?: string;
  references: Map<string, any>; // For "this", "that" references
  pending_actions: string[];
  created_at: string;
  last_active: string;
}

export interface Session {
  id: string;
  state: SessionState;
  context: SessionContext;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private sessionTimeout = 300000; // 5 minutes

  constructor(private eventBus: EventBus) {
    // Listen to state updates
    this.eventBus.on('state.update', (event) => {
      this.handleStateUpdate(event);
    });
  }

  /**
   * Create a new session
   */
  createSession(sessionId?: string): Session {
    const id = sessionId || this.generateSessionId();
    const session: Session = {
      id,
      state: 'idle',
      context: {
        turn_count: 0,
        references: new Map(),
        pending_actions: [],
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      },
    };

    this.sessions.set(id, session);
    console.log(`[SessionManager] Created session: ${id}`);

    // Emit state update
    this.emitStateUpdate(session);

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.context.last_active = new Date().toISOString();
    }
    return session;
  }

  /**
   * Update session state
   */
  updateState(sessionId: string, state: SessionState, contextUpdate?: Partial<SessionContext>): void {
    const session = this.getSession(sessionId);
    if (!session) {
      console.warn(`[SessionManager] Session not found: ${sessionId}`);
      return;
    }

    session.state = state;
    if (contextUpdate) {
      Object.assign(session.context, contextUpdate);
    }
    session.context.last_active = new Date().toISOString();

    this.emitStateUpdate(session);
  }

  /**
   * Increment turn count
   */
  incrementTurn(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.context.turn_count++;
      session.context.last_active = new Date().toISOString();
    }
  }

  /**
   * Add a reference (for context resolution)
   */
  addReference(sessionId: string, key: string, value: any): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.context.references.set(key, value);
    }
  }

  /**
   * Get a reference
   */
  getReference(sessionId: string, key: string): any {
    const session = this.getSession(sessionId);
    return session?.context.references.get(key);
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.state = 'closed';
      this.emitStateUpdate(session);
      this.sessions.delete(sessionId);
      console.log(`[SessionManager] Closed session: ${sessionId}`);
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      const lastActive = new Date(session.context.last_active).getTime();
      if (now - lastActive > this.sessionTimeout) {
        console.log(`[SessionManager] Session expired: ${id}`);
        this.closeSession(id);
      }
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Handle state update events
   */
  private handleStateUpdate(event: StateUpdateEvent): void {
    const session = this.sessions.get(event.session_id);
    if (session && event.context) {
      if (event.context.turn_count !== undefined) {
        session.context.turn_count = event.context.turn_count;
      }
      if (event.context.last_intent) {
        session.context.last_intent = event.context.last_intent;
      }
      if (event.context.pending_actions) {
        session.context.pending_actions = event.context.pending_actions;
      }
    }
  }

  /**
   * Emit state update event
   */
  private emitStateUpdate(session: Session): void {
    const event: StateUpdateEvent = {
      session_id: session.id,
      state: session.state,
      context: {
        turn_count: session.context.turn_count,
        last_intent: session.context.last_intent,
        references: Object.fromEntries(session.context.references),
        pending_actions: session.context.pending_actions,
      },
      timestamp: new Date().toISOString(),
    };

    this.eventBus.emit('state.update', event);
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
