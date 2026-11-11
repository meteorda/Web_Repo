// Groq 前端呼叫（經本機代理）+ 有限重試與備援模型
import { LIMITS } from '../config.js';

export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'unknown', retryAfterMs = null, retryable = false, detail = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.retryAfterMs = retryAfterMs;
    this.retryable = retryable;
    this.detail = detail;
  }
}

/** 依 HTTP 狀態分類錯誤 */
export function classifyStatus(status) {
  if (status === 400) return { kind: 'bad_request', retryable: false, message: '請求格式或參數不被支援（400）' };
  if (status === 401 || status === 403) return { kind: 'auth', retryable: false, message: `認證或權限問題（${status}），請確認 API Key` };
  if (status === 404) return { kind: 'not_found', retryable: false, message: '模型或資源不可用（404）' };
  if (status === 413) return { kind: 'too_large', retryable: false, message: '請求資料過大（413）' };
  if (status === 429) return { kind: 'rate_limit', retryable: true, message: '速率或用量限制（429）' };
  if (status === 408 || status === 504) return { kind: 'timeout', retryable: true, message: `上游逾時（${status}）` };
  if (status >= 500) return { kind: 'server', retryable: true, message: `服務端錯誤（${status}）` };
  return { kind: 'unknown', retryable: false, message: `未預期的回應（${status}）` };
}

/** Retry-After：秒數或 HTTP 日期 → 毫秒 */
export function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 1000);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : Math.max(0, t - now);
}

/** 指數退避 + 隨機抖動（上限 cap） */
export function backoffMs(attempt, random = Math.random, base = 1000, cap = 8000) {
  const exp = Math.min(cap, base * 2 ** attempt);
  return Math.round(exp * (0.5 + random() * 0.5));
}

export function abortableSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ApiError('使用者已取消', { kind: 'cancelled' }));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new ApiError('使用者已取消', { kind: 'cancelled' }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * 有限重試：最多 maxRetries 次自動重試（總嘗試 = maxRetries + 1）
 * - 不可重試錯誤（認證、400、404、413、取消）立即拋出
 * - 429 優先遵循 Retry-After（上限 maxWaitMs），否則指數退避
 */
export async function runWithRetry(fn, { maxRetries = 2, signal, sleep = abortableSleep, random = Math.random, onRetry, maxWaitMs = 30000 } = {}) {
  let attempt = 0;
  for (;;) {
    if (signal?.aborted) throw new ApiError('使用者已取消', { kind: 'cancelled' });
    try {
      return await fn(attempt);
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(err?.message || '未知錯誤', { kind: 'unknown' });
      if (e.kind === 'cancelled' || signal?.aborted) throw new ApiError('使用者已取消', { kind: 'cancelled' });
      if (!e.retryable || attempt >= maxRetries) {
        e.attempts = attempt + 1;
        throw e;
      }
      const wait = e.kind === 'rate_limit' && e.retryAfterMs !== null ? Math.min(e.retryAfterMs, maxWaitMs) : backoffMs(attempt, random);
      onRetry?.({ attempt: attempt + 1, waitMs: wait, error: e });
      await sleep(wait, signal);
      attempt += 1;
    }
  }
}

function keyHeaders(apiKey) {
  const h = { 'Content-Type': 'application/json' };
  if (apiKey) h['X-Groq-Key'] = apiKey; // 僅放在 header，不放網址
  return h;
}

async function toApiError(res) {
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.error?.message || j?.message || '';
  } catch {
    /* 非 JSON */
  }
  const c = classifyStatus(res.status);
  return new ApiError(c.message, {
    status: res.status,
    kind: c.kind,
    retryable: c.retryable,
    retryAfterMs: parseRetryAfter(res.headers.get('retry-after')),
    detail: String(detail).slice(0, 300),
  });
}

/** 單次 fetch，含逾時與取消 */
export async function fetchWithTimeout(url, opts, { signal, timeoutMs = LIMITS.AI_CLIENT_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetchImpl(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (signal?.aborted) throw new ApiError('使用者已取消', { kind: 'cancelled' });
    if (timedOut) throw new ApiError(`請求逾時（${Math.round(timeoutMs / 1000)} 秒）`, { kind: 'timeout', retryable: true });
    throw new ApiError('網路中斷或無法連線至本機代理伺服器', { kind: 'network', retryable: true, detail: String(e?.message || '') });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function getServerInfo(fetchImpl = fetch) {
  try {
    const r = await fetchImpl('/api/health');
    if (!r.ok) return { ok: false };
    return { ok: true, ...(await r.json()) };
  } catch {
    return { ok: false };
  }
}

/** 取得模型清單 */
export async function fetchModels(apiKey, { signal, fetchImpl = fetch } = {}) {
  const res = await fetchWithTimeout('/api/groq/models', { method: 'POST', headers: keyHeaders(apiKey), body: '{}' }, { signal, timeoutMs: 20000, fetchImpl });
  if (!res.ok) throw await toApiError(res);
  let j;
  try {
    j = await res.json();
  } catch {
    throw new ApiError('模型清單回應不是有效 JSON', { kind: 'bad_response' });
  }
  if (!Array.isArray(j?.data)) throw new ApiError('模型清單結構異常', { kind: 'bad_response' });
  return j.data
    .filter((m) => m && typeof m.id === 'string')
    .map((m) => ({
      id: m.id,
      active: m.active !== false,
      ownedBy: m.owned_by || '',
      contextWindow: m.context_window ?? null,
      likelyNonChat: /whisper|tts|guard|distil|embed|orpheus|playai/i.test(m.id),
    }))
    .sort((a, b) => Number(a.likelyNonChat) - Number(b.likelyNonChat) || a.id.localeCompare(b.id));
}

/** 驗證回應結構 */
export function parseChatResponse(j) {
  const choice = j?.choices?.[0];
  if (!choice || typeof choice !== 'object') throw new ApiError('回應 JSON 結構異常（缺少 choices）', { kind: 'bad_response' });
  const content = choice?.message?.content;
  if (typeof content !== 'string') throw new ApiError('回應 JSON 結構異常（缺少 message.content）', { kind: 'bad_response' });
  if (!content.trim()) throw new ApiError('模型回傳空內容', { kind: 'empty', retryable: true });
  const u = j.usage || {};
  return {
    content,
    model: typeof j.model === 'string' ? j.model : null,
    finishReason: choice.finish_reason ?? null,
    truncated: choice.finish_reason === 'length',
    usage: {
      prompt: u.prompt_tokens ?? null,
      completion: u.completion_tokens ?? null,
      total: u.total_tokens ?? null,
      apiTotalTime: u.total_time ?? j?.x_groq?.usage?.total_time ?? null,
      completionTime: u.completion_time ?? null,
      queueTime: u.queue_time ?? null,
    },
  };
}

async function chatOnce({ apiKey, model, messages, maxTokens, signal, fetchImpl }) {
  const body = { model, messages, temperature: 0.3, stream: false };
  if (maxTokens) body.max_completion_tokens = maxTokens;
  const res = await fetchWithTimeout('/api/groq/chat', { method: 'POST', headers: keyHeaders(apiKey), body: JSON.stringify(body) }, { signal, fetchImpl });
  if (!res.ok) throw await toApiError(res);
  let j;
  try {
    j = await res.json();
  } catch {
    throw new ApiError('回應不是有效 JSON', { kind: 'bad_response' });
  }
  return parseChatResponse(j);
}

/**
 * 執行分析：主要模型（含 ≤2 次自動重試）→ 若允許且設定，備援模型一次（同樣 ≤2 次重試）
 * 認證、取消、413 不切換備援。不修改分析資料。
 */
export async function analyze({ apiKey, primary, fallback, allowFallback, messages, maxTokens, signal, onStatus, fetchImpl = fetch, sleep, random }) {
  if (!primary) throw new ApiError('請先選擇主要模型', { kind: 'config' });
  const t0 = performance.now();
  const tryModel = async (model) => {
    let mt = maxTokens;
    return runWithRetry(
      async (attempt) => {
        onStatus?.(`呼叫 ${model}${attempt ? `（第 ${attempt} 次重試）` : ''}…`);
        try {
          return await chatOnce({ apiKey, model, messages, maxTokens: mt, signal, fetchImpl });
        } catch (e) {
          // 若模型不支援輸出長度參數，移除後重試一次
          if (e.kind === 'bad_request' && mt && /max_completion_tokens|max_tokens/i.test(e.detail)) {
            mt = undefined;
            e.retryable = true;
          }
          throw e;
        }
      },
      { maxRetries: 2, signal, sleep, random, onRetry: ({ attempt, waitMs, error }) => onStatus?.(`${error.message}，${Math.round(waitMs / 100) / 10} 秒後自動重試（${attempt}/2）`) },
    );
  };
  let usedFallback = false;
  let result;
  let primaryError = null;
  try {
    result = await tryModel(primary);
  } catch (e) {
    primaryError = e;
    const canFallback = allowFallback && fallback && fallback !== primary && !['auth', 'cancelled', 'too_large', 'config'].includes(e.kind);
    if (!canFallback) throw e;
    onStatus?.(`主要模型失敗（${e.message}），改用備援模型 ${fallback}`);
    usedFallback = true;
    result = await tryModel(fallback);
  }
  return {
    ...result,
    requestedModel: usedFallback ? fallback : primary,
    usedFallback,
    primaryError: primaryError ? primaryError.message : null,
    clientTotalMs: Math.round(performance.now() - t0),
  };
}
