// 全域限制與常數（前端）
export const LIMITS = Object.freeze({
  CSV_MAX_BYTES: 10 * 1024 * 1024, // 10 MB
  PDF_MAX_BYTES: 20 * 1024 * 1024, // 20 MB
  PDF_MAX_PAGES: 50,
  MAX_ROWS: 50000,
  AI_MAX_INPUT_CHARS: 24000, // 送往 AI 的訊息總字元上限（非 Token 數）
  AI_CUSTOM_QUESTION_MAX: 1000,
  AI_RECENT_ROWS: 20,
  AI_CLIENT_TIMEOUT_MS: 90000,
  STORAGE_KEY: 'twsa:v1',
  STORAGE_VERSION: 1,
});

export const ADJUSTMENT_LABELS = Object.freeze({
  adjusted: '已還原權息',
  unadjusted: '未還原',
  unknown: '未知（未確認是否還原權息）',
});

export const VOLUME_UNITS = Object.freeze(['股', '張']);

export const RISK_DISCLAIMER =
  '本系統提供之數據、指標與 AI 解讀僅供學習與參考，不構成任何投資建議或買賣邀約；過去表現不代表未來結果，投資有風險，請自行判斷並承擔風險。';
