import { experimental_generateSpeech as generateSpeech } from "ai";
import type { Experimental_SpeechResult } from "ai";
import { openai } from "@ai-sdk/openai";

export interface VoiceSynthesisOptions {
  voice?: string;
  model?: string;
}

export interface VoiceSynthesisResult {
  base64: string;
  mimeType: string;
}

export async function synthesizeSpeech(
  text: string,
  { voice = "alloy", model = "tts-1" }: VoiceSynthesisOptions = {}
): Promise<VoiceSynthesisResult> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text is required to synthesize speech");
  }

  const result: Experimental_SpeechResult = await generateSpeech({
    model: openai.speech(model),
    text,
    voice,
  });

  const file = result.audio;

  if (!file?.base64) {
    throw new Error("Failed to retrieve audio buffer from TTS response");
  }

  return {
    base64: file.base64,
    mimeType: file.mediaType || "audio/mpeg",
  };
}
