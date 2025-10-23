"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { generateSpeechAction, transcribeAudioAction } from "./actions";

const DEFAULT_TTS_MODEL = "tts-1";
const DEFAULT_TTS_VOICE = "alloy";
const TTS_MODELS = [
  { value: "tts-1", label: "tts-1" },
  { value: "gpt-4o-mini-tts", label: "gpt-4o-mini-tts" },
];
const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy" },
  { value: "ash", label: "Ash" },
  { value: "coral", label: "Coral" },
  { value: "echo", label: "Echo" },
  { value: "fable", label: "Fable" },
  { value: "nova", label: "Nova" },
  { value: "onyx", label: "Onyx" },
  { value: "sage", label: "Sage" },
  { value: "shimmer", label: "Shimmer" },
];

// Capture microphone chunks every 250ms for responsive recording
const CHUNK_INTERVAL_MS = 250;

function base64ToObjectUrl(base64: string, mimeType: string): string {
  if (typeof window === "undefined") return "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window === "undefined" ? "" : window.btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"tts" | "asr">("tts");

  const [text, setText] = useState("");
  const [voice, setVoice] = useState(DEFAULT_TTS_VOICE);
  const [model, setModel] = useState(DEFAULT_TTS_MODEL);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<string | null>(null);
  const [ttsLog, setTtsLog] = useState<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [asrStatus, setAsrStatus] = useState<string | null>(null);
  const [asrLog, setAsrLog] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isPending, startTransition] = useTransition();
  const recordedObjectUrlRef = useRef<string | null>(null);
  const generatedAudioUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    if (generatedAudioUrlRef.current) {
      URL.revokeObjectURL(generatedAudioUrlRef.current);
      generatedAudioUrlRef.current = null;
    }
    if (recordedObjectUrlRef.current) {
      URL.revokeObjectURL(recordedObjectUrlRef.current);
      recordedObjectUrlRef.current = null;
    }
  }, []);

  const ttsDisabled = useMemo(() => !text.trim() || isPending, [text, isPending]);

  const handleGenerate = () => {
    if (!text.trim()) {
      setTtsStatus("テキストを入力してください。");
      return;
    }

    startTransition(async () => {
      setTtsStatus("音声を生成しています…");
      setTtsLog(null);

      const result = await generateSpeechAction({
        text,
        voice,
        model,
      });

      if (!result.success || !result.audioBase64) {
        setTtsStatus(result.error ?? "音声生成に失敗しました。");
        return;
      }

      if (generatedAudioUrlRef.current) {
        URL.revokeObjectURL(generatedAudioUrlRef.current);
      }

      const url = base64ToObjectUrl(result.audioBase64, result.mimeType ?? "audio/mpeg");
      generatedAudioUrlRef.current = url;
      setAudioUrl(url);
      setTtsStatus("音声を生成しました。");
      setTtsLog(
        [
          `voice: ${voice}`,
          `model: ${model}`,
          `bytes: ${Math.round((result.audioBase64.length * 3) / 4)}`,
        ].join("\n")
      );
    });
  };

  const handleTranscribeFile = () => {
    if (!audioFile) {
      setAsrStatus("音声ファイルを選択してください。");
      return;
    }

    startTransition(async () => {
      setAsrStatus("音声を解析しています…");
      setAsrLog(null);

      const buffer = await audioFile.arrayBuffer();
      const result = await transcribeAudioAction({
        audioBase64: arrayBufferToBase64(buffer),
        mimeType: audioFile.type || undefined,
        filenameHint: audioFile.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "upload",
      });

      if (!result.success || !result.text) {
        setAsrStatus(result.error ?? "文字起こしに失敗しました。");
        return;
      }

      setAsrStatus("文字起こしが完了しました。");
      setAsrLog(
        [
          `source: file`,
          `language: ${result.language ?? "unknown"}`,
          `duration: ${result.durationInSeconds ?? "-"}s`,
          `confidence: ${result.confidence !== undefined ? (result.confidence * 100).toFixed(1) + "%" : "-"}`,
        ].join("\n")
      );
      setTranscript(result.text);
      setText(result.text);
    });
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
        setAsrStatus("録音を停止しています…");
      }
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setAsrStatus("このブラウザはマイク入力に対応していません。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (recordedObjectUrlRef.current) {
          URL.revokeObjectURL(recordedObjectUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        recordedObjectUrlRef.current = url;
        setRecordedUrl(url);

        const base64 = await blobToBase64(blob);
        startTransition(async () => {
          setAsrStatus("音声を解析しています…");
          setAsrLog(null);

          const result = await transcribeAudioAction({
            audioBase64: base64,
            mimeType,
            filenameHint: "recording",
          });

          if (!result.success || !result.text) {
            setAsrStatus(result.error ?? "文字起こしに失敗しました。");
            return;
          }

          setAsrStatus("文字起こしが完了しました。");
          setAsrLog(
            [
              `source: microphone`,
              `language: ${result.language ?? "unknown"}`,
              `duration: ${result.durationInSeconds ?? "-"}s`,
              `confidence: ${result.confidence !== undefined ? (result.confidence * 100).toFixed(1) + "%" : "-"}`,
            ].join("\n")
          );
          setTranscript(result.text);
          setText(result.text);
        });
      };

      recorder.start(CHUNK_INTERVAL_MS);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setAsrStatus("録音中…");
      setAsrLog(null);
      setTranscript("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "マイクの使用に失敗しました。";
      setAsrStatus(message);
    }
  };

  const resetTts = () => {
    setText("");
    setVoice(DEFAULT_TTS_VOICE);
    setModel(DEFAULT_TTS_MODEL);
    setTtsStatus(null);
    setTtsLog(null);
    if (generatedAudioUrlRef.current) {
      URL.revokeObjectURL(generatedAudioUrlRef.current);
      generatedAudioUrlRef.current = null;
    }
    setAudioUrl(null);
  };

  const resetAsr = () => {
    setAudioFile(null);
    setTranscript("");
    setAsrStatus(null);
    setAsrLog(null);
    if (recordedObjectUrlRef.current) {
      URL.revokeObjectURL(recordedObjectUrlRef.current);
      recordedObjectUrlRef.current = null;
    }
    setRecordedUrl(null);
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h1>🧠 Mypato Voice Console</h1>
        <p>テキスト読み上げと音声文字起こしをブラウザだけで試せます。</p>
      </section>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === "tts" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("tts")}
        >
          音声生成 (TTS)
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "asr" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("asr")}
        >
          文字起こし (ASR)
        </button>
      </div>

      {activeTab === "tts" ? (
        <section className="card">
          <label htmlFor="text-input">テキスト</label>
          <textarea
            id="text-input"
            placeholder="例: 明日の朝に起きる時間を教えて。"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />

          <div className="actions">
            <label>
              モデル
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="select"
              >
                {TTS_MODELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              ボイス
              <select
                value={voice}
                onChange={(event) => setVoice(event.target.value)}
                className="select"
              >
                {VOICE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="actions">
            <button
              type="button"
              onClick={handleGenerate}
              className="primary-btn"
              disabled={ttsDisabled}
            >
              {isPending ? "生成中…" : "音声を生成"}
            </button>
            <button type="button" onClick={resetTts} className="secondary-btn">
              リセット
            </button>
          </div>

          {ttsStatus && <p className="status">{ttsStatus}</p>}
          {ttsLog && <pre className="log">{ttsLog}</pre>}

          {audioUrl && (
            <audio className="audio-preview" controls src={audioUrl}>
              お使いのブラウザは audio タグに対応していません。
            </audio>
          )}
        </section>
      ) : (
        <section className="card">
          <label htmlFor="audio-input">音声ファイル（m4a / wav / mp4 / webm）</label>
          <input
            id="audio-input"
            className="file-input"
            type="file"
            accept="audio/*"
            onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
          />

          <div className="actions">
            <button
              type="button"
              onClick={handleTranscribeFile}
              className="secondary-btn"
              disabled={isPending || !audioFile}
            >
              {isPending ? "解析中…" : "ファイルを文字起こし"}
            </button>
            <button type="button" onClick={resetAsr} className="secondary-btn">
              リセット
            </button>
          </div>

          <div className="divider" />

          <div className="actions">
            <button
              type="button"
              onClick={handleRecordToggle}
              className={`record-btn ${isRecording ? "recording" : ""}`}
              disabled={isPending}
            >
              {isRecording ? "録音停止" : "🎙️ マイクで録音"}
            </button>
          </div>

          {recordedUrl && (
            <audio className="audio-preview" controls src={recordedUrl}>
              お使いのブラウザは audio タグに対応していません。
            </audio>
          )}

          {asrStatus && <p className="status">{asrStatus}</p>}
          {asrLog && <pre className="log">{asrLog}</pre>}
          {transcript && <pre className="transcript">{transcript}</pre>}
        </section>
      )}
    </div>
  );
}
