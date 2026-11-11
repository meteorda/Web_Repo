// 資料驗證與清洗（純函式，可於 Node 測試）

export const MISSING_TOKENS = new Set(['', '--', '---', '-', 'N/A', 'NA', 'n/a', 'na', 'null', 'NULL', 'None', 'X', 'x', '—', '－', '－－']);

/**
 * 解析數值：去除前後空白、千分位逗號；缺值記號轉 null（不得轉 0）
 * @returns {{ value: number|null, status: 'ok'|'missing'|'invalid' }}
 */
export function parseNumber(input) {
  if (input === null || input === undefined) return { value: null, status: 'missing' };
  if (typeof input === 'number') return Number.isFinite(input) ? { value: input, status: 'ok' } : { value: null, status: 'invalid' };
  let s = String(input).trim();
  if (MISSING_TOKENS.has(s)) return { value: null, status: 'missing' };
  s = s.replace(/[,，\s]/g, '').replace(/^\+/, '');
  if (s === '') return { value: null, status: 'missing' };
  if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return { value: null, status: 'invalid' };
  const v = Number(s);
  return Number.isFinite(v) ? { value: v, status: 'ok' } : { value: null, status: 'invalid' };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 以 UTC 驗證日曆日期，避免時區偏移 */
export function isRealDate(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * 解析日期字串為 'YYYY-MM-DD'（純字串處理，不經本地時區）
 * mode: 'auto' | 'roc' | 'ad'
 *  - 4 位數年份：西元
 *  - 3 位數年份：民國（+1911）
 *  - 1～2 位數年份：auto 模式下視為歧義，需使用者確認（roc→民國；ad→20xx）
 *  - 含「民國」字樣：民國
 * @returns {{ date: string|null, status: 'ok'|'invalid'|'ambiguous', roc: boolean }}
 */
export function parseDate(input, mode = 'auto') {
  if (input === null || input === undefined) return { date: null, status: 'invalid', roc: false };
  let s = String(input).trim();
  if (!s) return { date: null, status: 'invalid', roc: false };
  let forceRoc = false;
  if (/^民國/.test(s)) {
    forceRoc = true;
    s = s.replace(/^民國\s*/, '');
  }
  // 去除時間部分
  s = s.replace(/[T\s]\d{1,2}:\d{2}(:\d{2})?.*$/, '');
  let y;
  let m;
  let d;
  let yLen;
  let match = s.match(/^(\d{1,4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?$/);
  if (match) {
    yLen = match[1].length;
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  } else if ((match = s.match(/^(\d{4})(\d{2})(\d{2})$/))) {
    yLen = 4;
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  } else if ((match = s.match(/^(\d{3})(\d{2})(\d{2})$/))) {
    yLen = 3;
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  } else {
    return { date: null, status: 'invalid', roc: false };
  }

  let roc = false;
  if (forceRoc || yLen === 3) {
    roc = true;
    y += 1911;
  } else if (yLen <= 2) {
    if (mode === 'roc') {
      roc = true;
      y += 1911;
    } else if (mode === 'ad') {
      y += 2000;
    } else {
      return { date: null, status: 'ambiguous', roc: false };
    }
  } else if (yLen === 4 && mode === 'roc' && y < 1911) {
    // 例如 0113 被補零的民國年
    roc = true;
    y += 1911;
  }
  if (!isRealDate(y, m, d)) return { date: null, status: 'invalid', roc };
  return { date: `${y}-${pad2(m)}-${pad2(d)}`, status: 'ok', roc };
}

export const CORE_FIELDS = ['date', 'open', 'high', 'low', 'close', 'volume'];
export const FIELD_LABELS = {
  date: '日期',
  open: '開盤',
  high: '最高',
  low: '最低',
  close: '收盤',
  volume: '成交量',
  symbol: '股票代碼',
  name: '股票名稱',
};

/** 驗證 OHLCV 邏輯，回傳錯誤原因陣列 */
export function validateOHLC({ open, high, low, close, volume }) {
  const reasons = [];
  for (const [k, v] of Object.entries({ open, high, low, close })) {
    if (!(v > 0)) reasons.push(`${FIELD_LABELS[k]}必須為正數`);
  }
  if (!(volume >= 0)) reasons.push('成交量不得為負數');
  if (reasons.length) return reasons;
  if (high < Math.max(open, close, low)) reasons.push('最高價低於開盤／收盤／最低價');
  if (low > Math.min(open, close, high)) reasons.push('最低價高於開盤／收盤／最高價');
  return reasons;
}

/**
 * 清洗原始列
 * @param {string[][]} rows 資料列（不含標題）
 * @param {Record<string, number|-1>} mapping 欄位 → 欄索引
 * @param {object} opt { symbol, name, dateMode, duplicatePolicy: 'first'|'last'|'drop', rowOffset }
 */
export function cleanRows(rows, mapping, opt = {}) {
  const { symbol = '', name = '', dateMode = 'auto', duplicatePolicy = 'first', rowOffset = 2 } = opt;
  const log = [];
  const errors = [];
  const candidates = [];
  let missing = 0;
  let anomaly = 0;
  let ambiguous = 0;
  let skippedNonData = 0;
  let rocConverted = 0;

  const get = (row, field) => {
    const idx = mapping[field];
    return idx === undefined || idx === null || idx < 0 ? undefined : row[idx];
  };

  rows.forEach((row, i) => {
    const rowNo = i + rowOffset;
    const nonEmpty = row.filter((c) => String(c ?? '').trim() !== '').length;
    if (nonEmpty < 3) {
      skippedNonData += 1;
      return;
    }
    const reasons = [];
    let kind = null;
    const sym = String(get(row, 'symbol') ?? symbol ?? '').trim() || String(symbol || '').trim();
    const nm = String(get(row, 'name') ?? name ?? '').trim() || String(name || '').trim();
    if (!sym) {
      reasons.push('缺少股票代碼');
      kind = 'missing';
    }
    const dRes = parseDate(get(row, 'date'), dateMode);
    if (dRes.status === 'ambiguous') {
      reasons.push('日期年份有歧義（需確認民國或西元）');
      kind = 'ambiguous';
    } else if (dRes.status === 'invalid') {
      reasons.push('日期無效或缺漏');
      kind = kind || 'anomaly';
    }
    if (dRes.roc) rocConverted += 1;
    const vals = {};
    for (const f of ['open', 'high', 'low', 'close', 'volume']) {
      const p = parseNumber(get(row, f));
      vals[f] = p.value;
      if (p.status === 'missing') {
        reasons.push(`${FIELD_LABELS[f]}缺值`);
        kind = kind || 'missing';
      } else if (p.status === 'invalid') {
        reasons.push(`${FIELD_LABELS[f]}非數值`);
        kind = kind || 'anomaly';
      }
    }
    if (!reasons.length) {
      const ohlc = validateOHLC(vals);
      if (ohlc.length) {
        reasons.push(...ohlc);
        kind = 'anomaly';
      }
    }
    if (reasons.length) {
      if (kind === 'missing') missing += 1;
      else if (kind === 'ambiguous') ambiguous += 1;
      else anomaly += 1;
      errors.push({ row: rowNo, kind, reasons, raw: row });
      return;
    }
    candidates.push({ rowNo, rec: { symbol: sym, name: nm || sym, date: dRes.date, ...vals } });
  });

  // 重複（同股票代碼＋日期）
  const groups = new Map();
  for (const c of candidates) {
    const key = `${c.rec.symbol}|${c.rec.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const duplicates = [];
  const records = [];
  let duplicateRemoved = 0;
  for (const [key, list] of groups) {
    if (list.length === 1) {
      records.push(list[0].rec);
      continue;
    }
    const [sym, date] = key.split('|');
    duplicates.push({ symbol: sym, date, rows: list.map((c) => c.rowNo), records: list.map((c) => c.rec) });
    if (duplicatePolicy === 'first') {
      records.push(list[0].rec);
      duplicateRemoved += list.length - 1;
    } else if (duplicatePolicy === 'last') {
      records.push(list[list.length - 1].rec);
      duplicateRemoved += list.length - 1;
    } else {
      duplicateRemoved += list.length; // drop: 全部捨棄
    }
  }
  records.sort((a, b) => (a.symbol === b.symbol ? (a.date < b.date ? -1 : 1) : a.symbol < b.symbol ? -1 : 1));

  const dates = records.map((r) => r.date).sort();
  const policyText = { first: '保留第一筆', last: '保留最後一筆', drop: '全部捨棄' }[duplicatePolicy];
  log.push('去除前後空白與千分位逗號');
  log.push('空字串、"--"、"N/A" 等視為缺值，該列排除，不補 0、不插值');
  log.push(`日期模式：${{ auto: '自動（3 位數年份視為民國，1～2 位數年份視為歧義）', roc: '民國年', ad: '西元年' }[dateMode]}`);
  if (rocConverted) log.push(`民國年轉換 ${rocConverted} 筆`);
  log.push('驗證：價格 > 0、成交量 ≥ 0、最高 ≥ 開/收/低、最低 ≤ 開/收/高');
  if (duplicates.length) log.push(`重複股票代碼＋日期 ${duplicates.length} 組，處理方式：${policyText}`);
  if (skippedNonData) log.push(`略過非資料列（有效欄位少於 3 個，如說明文字）${skippedNonData} 列`);
  log.push('依股票代碼、日期由舊到新排序；不補齊週末、假日或缺漏交易日');

  return {
    records,
    errors,
    duplicates,
    log,
    stats: {
      raw: rows.length,
      skippedNonData,
      valid: records.length,
      missing,
      anomaly,
      ambiguous,
      duplicateGroups: duplicates.length,
      duplicateRemoved,
      dateRange: dates.length ? [dates[0], dates[dates.length - 1]] : null,
      symbols: [...new Set(records.map((r) => r.symbol))],
    },
  };
}
