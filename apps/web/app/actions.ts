"use server";

import { Buffer } from "node:buffer";
import { synthesizeSpeech } from "@agent/route/tts";
import type { VoiceSynthesisOptions } from "@agent/route/tts";
import { transcribeAudio } from "@agent/route/asr";

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

interface TranscribeInput {
  audioBase64: string;
  mimeType?: string;
  filenameHint?: string;
}

interface TranscribeResult {
  success: boolean;
  text?: string;
  language?: string;
  durationInSeconds?: number;
  error?: string;
}

export async function transcribeAudioAction({
  audioBase64,
  mimeType,
  filenameHint,
}: TranscribeInput): Promise<TranscribeResult> {
  if (!audioBase64) {
    return { success: false, error: "音声データが空です。" };
  }

  try {
    // Remove whitespace and URL-safe artifacts so Buffer.from can decode reliably
    const normalized = audioBase64.replace(/[^0-9A-Za-z+/=]/g, "");
    const buffer = Buffer.from(normalized, "base64");
    const result = await transcribeAudio(buffer, {
      mimeType,
      filenameHint,
    });
    return {
      success: true,
      text: result.text,
      language: result.language,
      durationInSeconds: result.durationInSeconds,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "文字起こしに失敗しました。";
    return { success: false, error: message };
  }
}
