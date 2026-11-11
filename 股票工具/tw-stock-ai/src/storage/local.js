// 本機儲存：只存資料集、欄位設定與非敏感偏好；絕不存 API Key
import { LIMITS } from '../config.js';
import { isValidRecord } from '../data/model.js';

const SENSITIVE_KEYS = ['apiKey', 'key', 'groqKey', 'token', 'authorization'];

function stripSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(k)) continue;
    out[k] = v && typeof v === 'object' ? stripSensitive(v) : v;
  }
  return out;
}

export function saveState({ datasets, prefs }, storage = globalThis.localStorage) {
  if (!storage) return { ok: false, error: '瀏覽器不支援本機儲存' };
  const data = {
    version: LIMITS.STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    datasets: datasets.filter((d) => !d.isDemo).map((d) => stripSensitive(d)),
    prefs: stripSensitive(prefs || {}),
  };
  try {
    storage.setItem(LIMITS.STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    const quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    return { ok: false, error: quota ? '本機儲存空間不足，匯入資料未保存（重新整理後需重新匯入）' : `本機儲存失敗：${e?.message}` };
  }
}

export function loadState(storage = globalThis.localStorage) {
  if (!storage) return { datasets: [], prefs: {}, warning: null };
  let raw;
  try {
    raw = storage.getItem(LIMITS.STORAGE_KEY);
  } catch {
    return { datasets: [], prefs: {}, warning: '無法讀取本機儲存' };
  }
  if (!raw) return { datasets: [], prefs: {}, warning: null };
  try {
    const data = JSON.parse(raw);
    if (data.version !== LIMITS.STORAGE_VERSION) {
      return { datasets: [], prefs: {}, warning: `本機資料版本（${data.version}）與目前版本不相容，已略過；可於「清除全部本機資料」移除。` };
    }
    const datasets = (data.datasets || []).filter((d) => Array.isArray(d.records) && d.records.every(isValidRecord));
    const dropped = (data.datasets || []).length - datasets.length;
    return { datasets, prefs: stripSensitive(data.prefs || {}), warning: dropped ? `${dropped} 個本機資料集格式不正確，已略過` : null };
  } catch {
    return { datasets: [], prefs: {}, warning: '本機資料已損毀，已略過' };
  }
}

export function clearAll(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(LIMITS.STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
