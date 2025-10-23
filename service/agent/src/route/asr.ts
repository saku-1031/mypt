/// <reference lib="dom" />

const EXT_BY_MIME: Record<string, string> = {
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mpga": "mpga",
  "audio/oga": "oga",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
};

export interface SpeechRecognitionOptions {
  model?: string;
  mimeType?: string;
  language?: string;
  filenameHint?: string;
}

export interface SpeechRecognitionResult {
  text: string;
  language?: string;
  durationInSeconds?: number;
}

function asUint8Array(source: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (source instanceof Uint8Array) return source;
  if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  throw new TypeError("Unsupported audio input type");
}

export async function transcribeAudio(
  audio: ArrayBuffer | ArrayBufferView,
  {
    model = "whisper-1",
    mimeType = "audio/mp4", // default aligns with iOS recordings; callers should set actual type when known
    language,
    filenameHint = "audio",
  }: SpeechRecognitionOptions = {}
): Promise<SpeechRecognitionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  if (typeof FormData === "undefined" || typeof Blob === "undefined") {
    throw new Error("FormData/Blob constructors are not available in this runtime");
  }

  const formData = new FormData();
  formData.set("model", model);
  if (language) formData.set("language", language);

  const blob = new Blob([asUint8Array(audio)], { type: mimeType });
  formData.append("file", blob, `${filenameHint}.${EXT_BY_MIME[mimeType] ?? "mp4"}`);

  const endpoint = `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/audio/transcriptions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status} ${response.statusText} - ${await response.text()}`);
  }

  const payload = await response.json();
  return {
    text: payload.text ?? "",
    language: payload.language ?? undefined,
    durationInSeconds: payload.duration ?? undefined,
  };
}
