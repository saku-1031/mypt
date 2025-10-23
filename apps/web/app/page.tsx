"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { generateSpeechAction } from "./actions";

const DEFAULT_MODEL = "tts-1";
const DEFAULT_VOICE = "alloy";

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const binary = typeof window === "undefined" ? "" : window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export default function HomePage() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(DEFAULT_VOICE);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Clean up object URL when unmounting or when audio changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const isDisabled = useMemo(
    () => !text.trim() || isPending,
    [text, isPending]
  );

  const handleGenerate = () => {
    if (!text.trim()) {
      setStatus("テキストを入力してください。");
      return;
    }

    startTransition(async () => {
      setStatus("音声を生成しています…");
      setLog(null);

      const result = await generateSpeechAction({
        text,
        voice,
        model,
      });

      if (!result.success || !result.audioBase64) {
        setStatus(result.error ?? "音声生成に失敗しました。");
        return;
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const url = base64ToObjectUrl(result.audioBase64, result.mimeType ?? "audio/mpeg");
      setAudioUrl(url);
      setStatus("音声を生成しました。");
      setLog(
        [
          `voice: ${voice}`,
          `model: ${model}`,
          `bytes: ${Math.round((result.audioBase64.length * 3) / 4)}`,
        ].join("\n")
      );
    });
  };

  const handleReset = () => {
    setText("");
    setVoice(DEFAULT_VOICE);
    setModel(DEFAULT_MODEL);
    setStatus(null);
    setLog(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h1>〇〇 is My partner</h1>
        <p>テキストを入力して OpenAI TTS に送信し、音声を生成します。</p>
      </section>

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
            <select value={model} onChange={(event) => setModel(event.target.value)} className="select">
              <option value="tts-1">tts-1</option>
              <option value="gpt-4o-mini-tts">gpt-4o-mini-tts</option>
            </select>
          </label>

          <label>
            ボイス
            <select value={voice} onChange={(event) => setVoice(event.target.value)} className="select">
              <option value="alloy">alloy</option>
              <option value="verse">verse</option>
              <option value="aria">aria</option>
            </select>
          </label>
        </div>

        <div className="actions">
          <button
            type="button"
            onClick={handleGenerate}
            className="primary-btn"
            disabled={isDisabled}
          >
            {isPending ? "生成中…" : "音声を生成"}
          </button>
          <button type="button" onClick={handleReset} className="secondary-btn">
            リセット
          </button>
        </div>

        {status && <p className="status">{status}</p>}
        {log && <pre className="log">{log}</pre>}

        {audioUrl && (
          <audio className="audio-preview" controls src={audioUrl}>
            お使いのブラウザは audio タグに対応していません。
          </audio>
        )}
      </section>
    </div>
  );
}
