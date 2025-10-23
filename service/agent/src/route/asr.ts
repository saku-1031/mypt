import { SpeechClient, protos } from "@google-cloud/speech";

// MIME type to encoding mapping for Google Cloud Speech
const ENCODING_BY_MIME: Record<string, protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding> = {
  "audio/flac": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC,
  "audio/wav": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
  "audio/x-wav": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
  "audio/mpeg": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3,
  "audio/mp3": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3,
  "audio/ogg": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS,
  "audio/webm": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
  "audio/webm;codecs=opus": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
};

export interface SpeechRecognitionOptions {
  model?: string;
  mimeType?: string;
  language?: string;
  filenameHint?: string;
  enableDiarization?: boolean;
  phraseHints?: string[];
}

export interface SpeechRecognitionResult {
  text: string;
  language?: string;
  durationInSeconds?: number;
  confidence?: number;
}

function asUint8Array(source: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (source instanceof Uint8Array) return source;
  if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  throw new TypeError("Unsupported audio input type");
}

let clientInstance: SpeechClient | null = null;

function getSpeechClient(): SpeechClient {
  if (!clientInstance) {
    // Google Cloud will use GOOGLE_APPLICATION_CREDENTIALS env var automatically
    clientInstance = new SpeechClient();
  }
  return clientInstance;
}

export async function transcribeAudio(
  audio: ArrayBuffer | ArrayBufferView,
  {
    model = "latest_long",
    mimeType = "audio/webm",
    language = "ja-JP",
    enableDiarization = false,
    phraseHints = [],
  }: SpeechRecognitionOptions = {}
): Promise<SpeechRecognitionResult> {
  const client = getSpeechClient();
  const audioBytes = asUint8Array(audio);

  // Determine encoding from MIME type
  const encoding = ENCODING_BY_MIME[mimeType] ||
    protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS;

  const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
    config: {
      encoding,
      languageCode: language,
      model,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: false,
      diarizationConfig: enableDiarization ? {
        enableSpeakerDiarization: true,
        minSpeakerCount: 2,
        maxSpeakerCount: 6,
      } : undefined,
      speechContexts: phraseHints.length > 0 ? [{
        phrases: phraseHints,
        boost: 20,
      }] : undefined,
    },
    audio: {
      content: audioBytes,
    },
  };

  const [response] = await client.recognize(request);

  if (!response.results || response.results.length === 0) {
    throw new Error("No transcription results returned from Google Cloud Speech");
  }

  // Combine all transcripts
  const transcript = response.results
    .map((result) => result.alternatives?.[0]?.transcript || "")
    .join(" ")
    .trim();

  const firstAlternative = response.results[0]?.alternatives?.[0];
  const confidence = firstAlternative?.confidence ?? undefined;

  // Extract detected language if available
  const detectedLanguage = response.results[0]?.languageCode || language;

  return {
    text: transcript,
    language: detectedLanguage,
    confidence,
    durationInSeconds: undefined, // Google Cloud doesn't return duration in basic response
  };
}
