/**
 * Agent route handler
 * Processes user text, calls LLM with function calling, executes tools (stub), and returns response
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { OpenAIClient, OpenAIClientError } from "../llm/openai.js";

// Note: If zod is not available, we'll implement basic validation
// For now, implementing inline validation without external dependencies

// ============================================================================
// Types & Validation
// ============================================================================

export interface AgentRequestBody {
  text: string;
  userDefaults?: {
    memo?: string;
    calendar?: string;
    music?: string;
    contact?: string;
    task?: string;
  };
  context?: {
    lastIntent?: string;
    lastObjects?: Record<string, any>;
  };
}

export interface AgentRequest {
  headers: Record<string, string>;
  body: AgentRequestBody;
}

export interface ToolAction {
  tool: string;
  args: Record<string, any>;
}

export interface ToolResult {
  ok: boolean;
  data?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

export interface AgentSuccessResponse {
  actions: ToolAction[];
  results: ToolResult[];
  speak: string;
  note: string;
}

export interface AgentErrorResponse {
  error: string;
}

export interface AgentResponse {
  status: number;
  body: AgentSuccessResponse | AgentErrorResponse;
}

/**
 * Validate request body
 */
function validateRequestBody(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Body must be an object" };
  }

  if (typeof body.text !== "string") {
    return { valid: false, error: "text field is required and must be a string" };
  }

  if (body.text.length === 0) {
    return { valid: false, error: "text field cannot be empty" };
  }

  if (body.text.length > 2000) {
    return { valid: false, error: "text field cannot exceed 2000 characters" };
  }

  return { valid: true };
}

/**
 * Validate LLM response
 */
function validateLLMResponse(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Response must be an object" };
  }

  if (!Array.isArray(data.actions)) {
    return { valid: false, error: "actions must be an array" };
  }

  if (typeof data.speak !== "string") {
    return { valid: false, error: "speak must be a string" };
  }

  if (typeof data.note !== "string") {
    return { valid: false, error: "note must be a string" };
  }

  return { valid: true };
}

// ============================================================================
// Tool Definitions
// ============================================================================

const tools = [
  {
    type: "function",
    function: {
      name: "memo.create",
      description: "·‚í\W~Y",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "·‚nÖπ",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calendar.add",
      description: "´ÏÛ¿¸k§ŸÛ»í˝†W~Y",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "§ŸÛ»nø§»Î",
          },
          datetime: {
            type: "string",
            description: "ÂBISO 8601b	",
          },
          location: {
            type: "string",
            description: "4@™◊∑ÁÛ	",
          },
        },
        required: ["title", "datetime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "music.control",
      description: "Û}çí6°W~Y",
      parameters: {
        type: "object",
        properties: {
          cmd: {
            type: "string",
            enum: ["play", "pause", "next", "prev"],
            description: "6°≥ﬁÛ…",
          },
        },
        required: ["cmd"],
      },
    },
  },
];

// ============================================================================
// Tool Execution (Stub)
// ============================================================================

/**
 * Execute a tool action (stub implementation)
 * TODO: Replace with actual MCP Hub calls
 */
async function executeToolAction(action: ToolAction): Promise<ToolResult> {
  // Simulate execution delay
  await new Promise((resolve) => setTimeout(resolve, 10));

  switch (action.tool) {
    case "memo.create":
      return {
        ok: true,
        data: {
          id: `memo_${Date.now()}`,
          text: action.args.text,
          createdAt: new Date().toISOString(),
        },
      };

    case "calendar.add":
      return {
        ok: true,
        data: {
          id: `event_${Date.now()}`,
          title: action.args.title,
          datetime: action.args.datetime,
          location: action.args.location,
          createdAt: new Date().toISOString(),
        },
      };

    case "music.control":
      return {
        ok: true,
        data: {
          cmd: action.args.cmd,
          status: "executed",
          timestamp: new Date().toISOString(),
        },
      };

    default:
      return {
        ok: false,
        error: {
          code: "UNKNOWN_TOOL",
          message: `Unknown tool: ${action.tool}`,
        },
      };
  }
}

// ============================================================================
// System Prompt Loading
// ============================================================================

let cachedSystemPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  try {
    // Get current file's directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const promptPath = join(__dirname, "../llm/prompts/system.md");

    cachedSystemPrompt = await readFile(promptPath, "utf-8");
    return cachedSystemPrompt;
  } catch (err) {
    throw new Error(`Failed to load system prompt: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

// ============================================================================
// LLM Processing
// ============================================================================

async function processWithLLM(
  client: OpenAIClient,
  userText: string,
  systemPrompt: string,
  maxRetries: number = 1
): Promise<AgentSuccessResponse> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Call LLM with function calling
      const response = await client.chat({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
        tools,
        toolChoice: "auto",
        temperature: 0.7,
      });

      // Parse response
      const message = response.choices?.[0]?.message;
      if (!message) {
        throw new Error("No message in LLM response");
      }

      // Extract actions from tool_calls
      const actions: ToolAction[] = [];
      if (message.tool_calls && Array.isArray(message.tool_calls)) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === "function") {
            actions.push({
              tool: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments || "{}"),
            });
          }
        }
      }

      // If no tool calls, we need to ask LLM to return structured response
      // For now, we'll parse from content if available
      let speak = "";
      let note = "";

      if (message.content) {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(message.content);
          const validation = validateLLMResponse(parsed);
          if (validation.valid) {
            return {
              actions: parsed.actions || actions,
              results: [],
              speak: parsed.speak,
              note: parsed.note,
            };
          }
        } catch {
          // Not JSON, use as speak text
          speak = message.content;
        }
      }

      // Return structured response
      return {
        actions,
        results: [],
        speak: speak || "üLW~W_",
        note: note || "",
      };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error("LLM processing failed");
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Agent endpoint handler
 * - Validates request
 * - Loads system prompt
 * - Calls LLM to determine actions
 * - Executes actions (stub)
 * - Returns response
 */
export async function agentHandler(req: AgentRequest): Promise<AgentResponse> {
  // Validate API key
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return {
      status: 401,
      body: { error: "Missing x-api-key header" },
    };
  }

  // Validate request body
  const validation = validateRequestBody(req.body);
  if (!validation.valid) {
    return {
      status: 400,
      body: { error: validation.error || "Invalid request body" },
    };
  }

  try {
    // Load system prompt
    const systemPrompt = await getSystemPrompt();

    // Process with LLM
    const client = new OpenAIClient();
    const llmResponse = await processWithLLM(client, req.body.text, systemPrompt);

    // Execute actions (stub)
    const results: ToolResult[] = [];
    for (const action of llmResponse.actions) {
      const result = await executeToolAction(action);
      results.push(result);
    }

    // Return response
    return {
      status: 200,
      body: {
        actions: llmResponse.actions,
        results,
        speak: llmResponse.speak,
        note: llmResponse.note,
      },
    };
  } catch (err) {
    // Map errors to HTTP status codes
    if (err instanceof OpenAIClientError) {
      switch (err.code) {
        case "NO_API_KEY":
          return { status: 401, body: { error: "OpenAI API key not configured" } };
        case "RETRYABLE":
          const cause = err.cause as any;
          const status = cause?.status || 502;
          return { status, body: { error: err.message } };
        default:
          return { status: 500, body: { error: err.message } };
      }
    }

    // Unknown error
    return {
      status: 500,
      body: { error: err instanceof Error ? err.message : "Unknown error" },
    };
  }
}
