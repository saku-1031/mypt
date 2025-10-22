/**
 * Calendar Add Capability
 *
 * カレンダーにイベントを追加するMCP capability の実装
 *
 * @module voice-hub/calendar_add
 */

/**
 * ISO 8601 日時文字列型
 * 例: "2025-10-23T10:00:00+09:00"
 */
export type ISO8601DateTime = string;

/**
 * カレンダーイベント追加リクエスト
 */
export interface CalendarAddRequest {
  /** イベントタイトル */
  title: string;

  /** 開始日時（ISO 8601形式） */
  start: ISO8601DateTime;

  /** 終了日時（ISO 8601形式） */
  end: ISO8601DateTime;

  /** 参加者のリスト（オプション） */
  attendees?: string[];

  /** 場所（オプション） */
  location?: string;

  /** 説明文（オプション） */
  description?: string;
}

/**
 * カレンダーイベント追加レスポンス
 */
export interface CalendarAddResponse {
  /** 生成されたイベントID */
  event_id: string;

  /** 開始日時（ISO 8601形式） */
  start: ISO8601DateTime;

  /** 終了日時（ISO 8601形式） */
  end: ISO8601DateTime;

  /** イベントのステータス */
  status: "confirmed" | "tentative";
}

/**
 * カレンダーイベント追加エラー
 */
export class CalendarAddError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CalendarAddError";
  }
}

/**
 * カレンダーにイベントを追加する
 *
 * @param request - イベント追加リクエスト
 * @returns イベント追加結果
 * @throws {CalendarAddError} イベント追加に失敗した場合
 *
 * @example
 * ```typescript
 * const result = await calendar_add({
 *   title: "田中さんとミーティング",
 *   start: "2025-10-23T10:00:00+09:00",
 *   end: "2025-10-23T10:30:00+09:00",
 *   attendees: ["tanaka@example.com"],
 *   location: "会議室A"
 * });
 *
 * console.log(`イベントID: ${result.event_id}`);
 * // => イベントID: evt_123456789
 * ```
 */
export async function calendar_add(
  request: CalendarAddRequest
): Promise<CalendarAddResponse> {
  // リクエストバリデーション
  validateRequest(request);

  // TODO: 実際のカレンダーAPI（Google Calendar, Outlook等）との連携実装
  // 現在はスタブ実装として、モックデータを返す

  console.log("[calendar_add] Adding calendar event:", {
    title: request.title,
    start: request.start,
    end: request.end,
    attendees: request.attendees,
    location: request.location,
    description: request.description,
  });

  // 模擬的な処理時間（実際のAPI呼び出しをシミュレート）
  await simulateApiCall(500);

  // スタブレスポンス生成
  const response: CalendarAddResponse = {
    event_id: generateEventId(),
    start: request.start,
    end: request.end,
    status: "confirmed",
  };

  console.log("[calendar_add] Event added successfully:", response);

  return response;
}

/**
 * リクエストをバリデーションする
 *
 * @param request - バリデーション対象のリクエスト
 * @throws {CalendarAddError} バリデーションエラー
 */
function validateRequest(request: CalendarAddRequest): void {
  if (!request.title || request.title.trim().length === 0) {
    throw new CalendarAddError(
      "タイトルは必須です",
      "INVALID_TITLE"
    );
  }

  if (!request.start || !isValidISO8601(request.start)) {
    throw new CalendarAddError(
      "開始日時が無効です",
      "INVALID_START_TIME",
      { start: request.start }
    );
  }

  if (!request.end || !isValidISO8601(request.end)) {
    throw new CalendarAddError(
      "終了日時が無効です",
      "INVALID_END_TIME",
      { end: request.end }
    );
  }

  const startDate = new Date(request.start);
  const endDate = new Date(request.end);

  if (endDate <= startDate) {
    throw new CalendarAddError(
      "終了日時は開始日時より後である必要があります",
      "INVALID_TIME_RANGE",
      { start: request.start, end: request.end }
    );
  }

  // イベント時間が24時間を超える場合は警告（オプション）
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  if (durationHours > 24) {
    console.warn("[calendar_add] Warning: Event duration exceeds 24 hours", {
      duration: durationHours,
    });
  }
}

/**
 * ISO 8601形式の日時文字列かどうかを簡易チェック
 *
 * @param dateTimeStr - チェック対象の文字列
 * @returns ISO 8601形式として妥当な場合true
 */
function isValidISO8601(dateTimeStr: string): boolean {
  try {
    const date = new Date(dateTimeStr);
    return !isNaN(date.getTime()) && dateTimeStr.includes("T");
  } catch {
    return false;
  }
}

/**
 * ユニークなイベントIDを生成する
 *
 * @returns イベントID
 */
function generateEventId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `evt_${timestamp}_${random}`;
}

/**
 * API呼び出しをシミュレートする（遅延を追加）
 *
 * @param ms - 遅延時間（ミリ秒）
 */
function simulateApiCall(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// デフォルトエクスポート
export default calendar_add;
