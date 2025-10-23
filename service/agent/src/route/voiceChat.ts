import { Buffer } from "node:buffer";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";

export interface VoiceSynthesisOptions {
  voice?: string;
  model?: string;
}

export interface VoiceSynthesisResult {
  base64: string;
  mimeType: string;
}

async function normalizeArrayBuffer(candidate: any): Promise<ArrayBuffer | null> {
  if (!candidate) return null;
  if (candidate instanceof ArrayBuffer) return candidate;
  if (ArrayBuffer.isView(candidate)) {
    const view = candidate as ArrayBufferView;
    if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength) {
      return view.buffer;
    }
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }
  if (typeof candidate.arrayBuffer === "function") {
    return candidate.arrayBuffer();
  }
  if (candidate.data) {
    return normalizeArrayBuffer(candidate.data);
  }
  return null;
}

/**
 * Synthesize speech audio for the given text using OpenAI TTS.
 * Defaults to the `tts-1` model and `alloy` voice if not specified.
 */
export async function synthesizeSpeech(
  text: string,
  { voice = "alloy", model = "tts-1" }: VoiceSynthesisOptions = {}
): Promise<VoiceSynthesisResult> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text is required to synthesize speech");
  }

  const result: any = await generateSpeech({
    model: openai.speech(model),
    text,
    voice,
  });

  let payload: any = result?.audio ?? result;
  if (Array.isArray(payload)) {
    payload = payload[0];
  }

  const mimeType = payload?.mimeType || result?.mimeType || "audio/mpeg";

  if (typeof payload?.base64 === "string") {
    return { base64: payload.base64, mimeType };
  }

  const arrayBuffer = await normalizeArrayBuffer(payload);
  if (!arrayBuffer) {
    throw new Error("Failed to retrieve audio buffer from TTS response");
  }

  const base64 = Buffer.from(new Uint8Array(arrayBuffer)).toString("base64");
  return { base64, mimeType };
}
