"use server";

import { synthesizeSpeech } from "@agent/route/voiceChat";
import type { VoiceSynthesisOptions } from "@agent/route/voiceChat";

interface GenerateSpeechInput extends VoiceSynthesisOptions {
  text: string;
}

interface GenerateSpeechResult {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  error?: string;
}

export async function generateSpeechAction({
  text,
  voice,
  model,
}: GenerateSpeechInput): Promise<GenerateSpeechResult> {
  if (!text || text.trim().length === 0) {
    return { success: false, error: "テキストを入力してください。" };
  }

  try {
    const { base64, mimeType } = await synthesizeSpeech(text, { voice, model });
    return { success: true, audioBase64: base64, mimeType };
  } catch (err) {
    const message = err instanceof Error ? err.message : "音声生成に失敗しました。";
    return { success: false, error: message };
  }
}
