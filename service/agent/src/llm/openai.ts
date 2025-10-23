/**
 * OpenAI API client wrapper with timeout, retry, and error handling
 */

// ============================================================================
// Utility Types & Error Classes
// ============================================================================

export class OpenAIClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "OpenAIClientError";
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wraps a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Retry a function with exponential backoff
 */
async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      if (attempt === maxAttempts) break;

      // Exponential backoff: 2^attempt * 100ms
      const delay = Math.pow(2, attempt) * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Check if error is retryable (429, 5xx)
 */
function isRetryableError(status?: number): boolean {
  if (!status) return false;
  return status === 429 || (status >= 500 && status < 600);
}

// ============================================================================
// OpenAI Client
// ============================================================================

export interface OpenAIClientOptions {
  apiKey?: string;
  debug?: (msg: string, meta?: any) => void;
}

export interface TranscribeInput {
  audio: ArrayBuffer;
  mime: "audio/m4a" | "audio/wav" | "audio/mp4";
}

export interface TranscribeOutput {
  text: string;
  lang?: string;
  confidence?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatInput {
  messages: ChatMessage[];
  tools?: any[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  temperature?: number;
}

export interface TTSInput {
  text: string;
  voice?: string;
}

export interface TTSOutput {
  audio: ArrayBuffer;
  mime: "audio/mpeg";
}

export class OpenAIClient {
  private apiKey: string;
  private debug: (msg: string, meta?: any) => void;
  private baseUrl = "https://api.openai.com/v1";

  constructor(opts: OpenAIClientOptions = {}) {
    this.apiKey = opts.apiKey || process.env.OPENAI_API_KEY || "";
    this.debug = opts.debug || (() => {});

    if (!this.apiKey) {
      throw new OpenAIClientError("API key is required", "NO_API_KEY");
    }
  }

  /**
   * Transcribe audio using Whisper
   * Max 15MB, 30s timeout, 2 retries
   */
  async transcribe(input: TranscribeInput): Promise<TranscribeOutput> {
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (input.audio.byteLength > maxSize) {
      throw new OpenAIClientError(
        `Audio size ${input.audio.byteLength} exceeds 15MB limit`,
        "FILE_TOO_LARGE"
      );
    }

    const model = process.env.OPENAI_MODEL_WHISPER || "whisper-1";
    this.debug("transcribe", { size: input.audio.byteLength, mime: input.mime });

    const execute = async () => {
      // Create form data manually
      const boundary = `----WebKitFormBoundary${Date.now()}`;
      const formData: Buffer[] = [];

      // Add file field
      formData.push(Buffer.from(`--${boundary}\r\n`));
      formData.push(
        Buffer.from(
          `Content-Disposition: form-data; name="file"; filename="audio.${this.getExtension(input.mime)}"\r\n`
        )
      );
      formData.push(Buffer.from(`Content-Type: ${input.mime}\r\n\r\n`));
      formData.push(Buffer.from(input.audio));
      formData.push(Buffer.from(`\r\n`));

      // Add model field
      formData.push(Buffer.from(`--${boundary}\r\n`));
      formData.push(Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\n`));
      formData.push(Buffer.from(`${model}\r\n`));

      // End boundary
      formData.push(Buffer.from(`--${boundary}--\r\n`));

      const body = Buffer.concat(formData);

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      if (!response.ok) {
        const error = await response.text();
        if (isRetryableError(response.status)) {
          throw new OpenAIClientError(
            `Transcribe failed: ${error}`,
            "RETRYABLE",
            { status: response.status }
          );
        }
        throw new OpenAIClientError(
          `Transcribe failed: ${error}`,
          "TRANSCRIBE_ERROR",
          { status: response.status }
        );
      }

      const result = await response.json();
      return {
        text: result.text || "",
        lang: result.language,
        confidence: undefined, // Whisper doesn't return confidence
      };
    };

    try {
      return await withTimeout(retry(execute, 2), 30000);
    } catch (err) {
      this.debug("transcribe error", err);
      throw err instanceof OpenAIClientError
        ? err
        : new OpenAIClientError("Transcribe failed", "TRANSCRIBE_ERROR", err);
    }
  }

  /**
   * Chat completion with function calling support
   * 30s timeout, 1 retry
   */
  async chat(input: ChatInput): Promise<any> {
    const model = process.env.OPENAI_MODEL_CHAT || "gpt-4o-mini";
    this.debug("chat", { messages: input.messages.length, tools: input.tools?.length });

    const execute = async () => {
      const body: any = {
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
      };

      if (input.tools && input.tools.length > 0) {
        body.tools = input.tools;
        if (input.toolChoice) {
          body.tool_choice = input.toolChoice;
        }
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        if (isRetryableError(response.status)) {
          throw new OpenAIClientError(
            `Chat failed: ${error}`,
            "RETRYABLE",
            { status: response.status }
          );
        }
        throw new OpenAIClientError(
          `Chat failed: ${error}`,
          "CHAT_ERROR",
          { status: response.status }
        );
      }

      return await response.json();
    };

    try {
      return await withTimeout(retry(execute, 1), 30000);
    } catch (err) {
      this.debug("chat error", err);
      throw err instanceof OpenAIClientError
        ? err
        : new OpenAIClientError("Chat failed", "CHAT_ERROR", err);
    }
  }

  /**
   * Text-to-speech
   * 15s timeout, no retry
   */
  async tts(input: TTSInput): Promise<TTSOutput> {
    const model = process.env.OPENAI_MODEL_TTS || "tts-1";
    this.debug("tts", { textLength: input.text.length });

    // Check if TTS is supported (basic validation)
    if (!model.startsWith("tts-")) {
      throw new OpenAIClientError(
        `TTS model ${model} is not supported`,
        "TTS_UNSUPPORTED"
      );
    }

    const execute = async () => {
      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: input.text,
          voice: input.voice || "alloy",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new OpenAIClientError(
          `TTS failed: ${error}`,
          "TTS_ERROR",
          { status: response.status }
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        audio: arrayBuffer,
        mime: "audio/mpeg" as const,
      };
    };

    try {
      return await withTimeout(execute(), 15000);
    } catch (err) {
      this.debug("tts error", err);
      throw err instanceof OpenAIClientError
        ? err
        : new OpenAIClientError("TTS failed", "TTS_ERROR", err);
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtension(mime: string): string {
    switch (mime) {
      case "audio/m4a":
        return "m4a";
      case "audio/wav":
        return "wav";
      case "audio/mp4":
        return "mp4";
      default:
        return "bin";
    }
  }
}
