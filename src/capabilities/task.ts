/**
 * Task MCP Capability Implementation
 */

import {
  TaskAddRequest,
  TaskAddResponse,
  TaskListRequest,
  TaskListResponse,
} from '../types/mcp.js';

// In-memory storage for demo
const tasks: Map<string, any> = new Map();
let taskIdCounter = 1;

/**
 * Add task
 */
export async function taskAdd(args: TaskAddRequest): Promise<TaskAddResponse> {
  console.log('[task.add] Adding task:', args);

  const taskId = `task_${taskIdCounter++}`;
  const task = {
    task_id: taskId,
    title: args.title,
    due: args.due,
    priority: args.priority || 'medium',
    description: args.description,
    link: args.link,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  };

  tasks.set(taskId, task);

  console.log('[task.add] Task created:', taskId);

  return {
    task_id: taskId,
    title: task.title,
    due: task.due,
    priority: task.priority,
    status: 'pending',
  };
}

/**
 * Complete task
 */
export async function taskComplete(args: any): Promise<any> {
  console.log('[task.complete] Completing task:', args);

  const task = tasks.get(args.task_id);
  if (!task) {
    throw new Error('Task not found');
  }

  task.status = 'completed';
  task.completed_at = new Date().toISOString();

  console.log('[task.complete] Task completed:', args.task_id);

  return {
    task_id: task.task_id,
    status: 'completed',
  };
}

/**
 * List tasks
 */
export async function taskList(args: TaskListRequest = {}): Promise<TaskListResponse> {
  console.log('[task.list] Listing tasks:', args);

  const taskList = Array.from(tasks.values())
    .filter((task) => {
      if (args.status === 'all' || !args.status) return true;
      return task.status === args.status;
    })
    .slice(0, args.limit || 20)
    .map((task) => ({
      task_id: task.task_id,
      title: task.title,
      due: task.due,
      priority: task.priority,
      status: task.status,
    }));

  console.log('[task.list] Found tasks:', taskList.length);

  return { tasks: taskList };
}
