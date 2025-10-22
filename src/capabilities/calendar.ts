/**
 * Calendar MCP Capability Implementation
 */

import {
  CalendarAddRequest,
  CalendarAddResponse,
} from '../types/mcp.js';

// In-memory storage for demo
const events: Map<string, any> = new Map();
let eventIdCounter = 1;

/**
 * Add calendar event
 */
export async function calendarAdd(args: CalendarAddRequest): Promise<CalendarAddResponse> {
  console.log('[calendar.add] Adding event:', args);

  // Build ISO datetime strings
  const start = buildDateTime(args.start);
  const end = buildDateTime(args.end);

  // Validate
  if (new Date(end) <= new Date(start)) {
    throw new Error('End time must be after start time');
  }

  // Create event
  const eventId = `evt_${eventIdCounter++}`;
  const event = {
    event_id: eventId,
    title: args.title,
    start,
    end,
    attendees: args.attendees || [],
    location: args.location,
    description: args.description,
    status: 'confirmed' as const,
    created_at: new Date().toISOString(),
  };

  events.set(eventId, event);

  console.log('[calendar.add] Event created:', eventId);

  return {
    event_id: eventId,
    start,
    end,
    status: 'confirmed',
  };
}

/**
 * Update calendar event
 */
export async function calendarUpdate(args: any): Promise<any> {
  console.log('[calendar.update] Updating event:', args);

  // Get last event (simplified for demo)
  const lastEvent = Array.from(events.values()).pop();

  if (!lastEvent) {
    throw new Error('No event to update');
  }

  // Update time if provided
  if (args.new_time) {
    const [hours, minutes] = args.new_time.split(':');
    const startDate = new Date(lastEvent.start);
    const endDate = new Date(lastEvent.end);
    const duration = endDate.getTime() - startDate.getTime();

    startDate.setHours(parseInt(hours), parseInt(minutes || '0'), 0, 0);
    endDate.setTime(startDate.getTime() + duration);

    lastEvent.start = startDate.toISOString();
    lastEvent.end = endDate.toISOString();
  }

  console.log('[calendar.update] Event updated:', lastEvent.event_id);

  return {
    event_id: lastEvent.event_id,
    start: lastEvent.start,
    end: lastEvent.end,
    status: 'confirmed',
  };
}

/**
 * List calendar events
 */
export async function calendarList(args: any = {}): Promise<any> {
  console.log('[calendar.list] Listing events');

  const eventList = Array.from(events.values())
    .slice(0, args.limit || 10)
    .map((e) => ({
      event_id: e.event_id,
      title: e.title,
      start: e.start,
      end: e.end,
      status: e.status,
    }));

  return { events: eventList };
}

/**
 * Build ISO datetime string from entities
 */
function buildDateTime(input: string): string {
  // If already ISO format, return as-is
  if (input.includes('T')) {
    return input;
  }

  // Parse date and time from entities
  // This is simplified - in production, use a proper date parser
  const today = new Date();

  // Check if input contains date info
  if (input.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Format: YYYY-MM-DD
    return `${input}T10:00:00+09:00`;
  }

  return input;
}
