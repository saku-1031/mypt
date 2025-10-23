/**
 * ASR (Automatic Speech Recognition) route handler
 * Transcribes audio to text using OpenAI Whisper
 */

import { OpenAIClient, OpenAIClientError } from "../llm/openai.js";

// ============================================================================
// Types
// ============================================================================

export interface ASRRequest {
  headers: Record<string, string>;
  body: ArrayBuffer;
  mime?: string;
}

export interface ASRSuccessResponse {
  text: string;
  lang?: string;
  conf?: number;
}

export interface ASRErrorResponse {
  error: string;
}

export interface ASRResponse {
  status: number;
  body: ASRSuccessResponse | ASRErrorResponse;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * ASR endpoint handler
 * - Validates API key
 * - Validates MIME type
 * - Checks file size (max 15MB)
 * - Calls OpenAI transcribe
 * - Returns transcription result
 */
export async function asrHandler(req: ASRRequest): Promise<ASRResponse> {
  // Validate API key
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return {
      status: 401,
      body: { error: "Missing x-api-key header" },
    };
  }

  // Validate MIME type (don't guess, require explicit)
  if (!req.mime) {
    return {
      status: 400,
      body: { error: "Missing mime type" },
    };
  }

  const allowedMimes = ["audio/m4a", "audio/wav", "audio/mp4"];
  if (!allowedMimes.includes(req.mime)) {
    return {
      status: 400,
      body: { error: `Unsupported mime type: ${req.mime}. Allowed: ${allowedMimes.join(", ")}` },
    };
  }

  // Check file size (max 15MB)
  const maxSize = 15 * 1024 * 1024;
  if (req.body.byteLength > maxSize) {
    return {
      status: 413,
      body: { error: `File size ${req.body.byteLength} exceeds 15MB limit` },
    };
  }

  // Transcribe
  try {
    const client = new OpenAIClient();
    const result = await client.transcribe({
      audio: req.body,
      mime: req.mime as "audio/m4a" | "audio/wav" | "audio/mp4",
    });

    return {
      status: 200,
      body: {
        text: result.text,
        lang: result.lang,
        conf: result.confidence,
      },
    };
  } catch (err) {
    // Map OpenAI errors to HTTP status codes
    if (err instanceof OpenAIClientError) {
      switch (err.code) {
        case "NO_API_KEY":
          return { status: 401, body: { error: "OpenAI API key not configured" } };
        case "FILE_TOO_LARGE":
          return { status: 413, body: { error: err.message } };
        case "RETRYABLE":
          // 429 or 5xx from OpenAI
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
