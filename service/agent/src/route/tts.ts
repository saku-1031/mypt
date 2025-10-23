/**
 * TTS (Text-to-Speech) route handler
 * Converts text to speech using OpenAI TTS
 */

import { OpenAIClient, OpenAIClientError } from "../llm/openai.js";

// ============================================================================
// Types
// ============================================================================

export interface TTSRequestBody {
  text: string;
  voice?: string;
}

export interface TTSRequest {
  headers: Record<string, string>;
  body: TTSRequestBody;
}

export interface TTSErrorResponse {
  error: string;
}

export interface TTSResponse {
  status: number;
  headers?: Record<string, string>;
  body: ArrayBuffer | TTSErrorResponse;
}

// ============================================================================
// Validation
// ============================================================================

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

  // Check if text is only whitespace
  if (body.text.trim().length === 0) {
    return { valid: false, error: "text field cannot be empty or whitespace only" };
  }

  if (body.text.length > 500) {
    return { valid: false, error: "text field cannot exceed 500 characters" };
  }

  if (body.voice !== undefined && typeof body.voice !== "string") {
    return { valid: false, error: "voice field must be a string if provided" };
  }

  return { valid: true };
}

// ============================================================================
// Handler
// ============================================================================

/**
 * TTS endpoint handler
 * - Validates API key
 * - Validates request body
 * - Calls OpenAI TTS
 * - Returns audio as ArrayBuffer
 */
export async function ttsHandler(req: TTSRequest): Promise<TTSResponse> {
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

  // Generate speech
  try {
    const client = new OpenAIClient();
    const result = await client.tts({
      text: req.body.text,
      voice: req.body.voice,
    });

    return {
      status: 200,
      headers: {
        "Content-Type": result.mime,
      },
      body: result.audio,
    };
  } catch (err) {
    // Map OpenAI errors to HTTP status codes
    if (err instanceof OpenAIClientError) {
      switch (err.code) {
        case "NO_API_KEY":
          return { status: 401, body: { error: "OpenAI API key not configured" } };
        case "TTS_UNSUPPORTED":
          return { status: 502, body: { error: err.message } };
        default:
          // Other TTS errors are likely OpenAI API issues
          return { status: 502, body: { error: err.message } };
      }
    }

    // Unknown error
    return {
      status: 500,
      body: { error: err instanceof Error ? err.message : "Unknown error" },
    };
  }
}
