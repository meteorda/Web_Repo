// 技術指標（純函式）。暖機期一律回傳 null，不補 0。
//
// 計算規則：
// - SMA(n)：最近 n 筆收盤的簡單平均；窗口內有 null 則為 null。
// - EMA(n)：以前 n 筆有效值之 SMA 作為初始值（置於第 n 筆），之後 EMA_t = α·x_t + (1-α)·EMA_{t-1}，α = 2/(n+1)。
// - RSI(14)：Wilder 平滑。首個平均漲跌幅 = 前 14 個變動之簡單平均，
//   之後 avg_t = (avg_{t-1}·13 + x_t)/14；RSI = 100 - 100/(1+RS)。平均跌幅 0 → 100；漲跌皆 0 → 50。
// - MACD(12,26,9)：DIF = EMA12 - EMA26；訊號線 (DEA/MACD) = DIF 之 EMA9；柱狀值 = DIF - 訊號線（預設不乘 2，可設定）。
// - KD(9,3,3)：RSV = (C - L9)/(H9 - L9)·100（H9 = L9 時 RSV = 50）；K、D 初始值 50，
//   K_t = 2/3·K_{t-1} + 1/3·RSV_t；D_t = 2/3·D_{t-1} + 1/3·K_t；第 9 筆起輸出。
// - 布林通道(20,2)：中線 = SMA20；上下軌 = 中線 ± 2·母體標準差（除以 n）。

export function sma(values, n) {
  const out = new Array(values.length).fill(null);
  for (let i = n - 1; i < values.length; i++) {
    let sum = 0;
    let ok = true;
    for (let j = i - n + 1; j <= i; j++) {
      const v = values[j];
      if (v === null || v === undefined || !Number.isFinite(v)) {
        ok = false;
        break;
      }
      sum += v;
    }
    out[i] = ok ? sum / n : null;
  }
  return out;
}

export function ema(values, n) {
  const out = new Array(values.length).fill(null);
  const alpha = 2 / (n + 1);
  let run = 0;
  let sum = 0;
  let prev = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const valid = v !== null && v !== undefined && Number.isFinite(v);
    if (prev === null) {
      if (!valid) {
        run = 0;
        sum = 0;
        continue;
      }
      run += 1;
      sum += v;
      if (run === n) {
        prev = sum / n;
        out[i] = prev;
      }
    } else {
      if (!valid) {
        // 中途缺值：重新暖機
        prev = null;
        run = 0;
        sum = 0;
        continue;
      }
      prev = alpha * v + (1 - alpha) * prev;
      out[i] = prev;
    }
  }
  return out;
}

export function rsi(closes, n = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch > 0) gain += ch;
    else loss -= ch;
  }
  let avgG = gain / n;
  let avgL = loss / n;
  const calc = () => (avgL === 0 ? (avgG === 0 ? 50 : 100) : 100 - 100 / (1 + avgG / avgL));
  out[n] = calc();
  for (let i = n + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    avgG = (avgG * (n - 1) + (ch > 0 ? ch : 0)) / n;
    avgL = (avgL * (n - 1) + (ch < 0 ? -ch : 0)) / n;
    out[i] = calc();
  }
  return out;
}

export function macd(closes, fast = 12, slow = 26, signal = 9, histMultiplier = 1) {
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const dif = closes.map((_, i) => (ef[i] === null || es[i] === null ? null : ef[i] - es[i]));
  const sig = ema(dif, signal);
  const hist = dif.map((d, i) => (d === null || sig[i] === null ? null : (d - sig[i]) * histMultiplier));
  return { dif, signal: sig, hist };
}

export function kd(highs, lows, closes, n = 9, kSmooth = 3, dSmooth = 3) {
  const len = closes.length;
  const K = new Array(len).fill(null);
  const D = new Array(len).fill(null);
  const RSV = new Array(len).fill(null);
  let kPrev = 50;
  let dPrev = 50;
  for (let i = n - 1; i < len; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - n + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    const rsv = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
    const k = ((kSmooth - 1) / kSmooth) * kPrev + (1 / kSmooth) * rsv;
    const d = ((dSmooth - 1) / dSmooth) * dPrev + (1 / dSmooth) * k;
    RSV[i] = rsv;
    K[i] = k;
    D[i] = d;
    kPrev = k;
    dPrev = d;
  }
  return { k: K, d: D, rsv: RSV };
}

export function bollinger(closes, n = 20, mult = 2) {
  const mid = sma(closes, n);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] === null) continue;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (closes[j] - mid[i]) ** 2;
    const sd = Math.sqrt(s / n);
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
  }
  return { mid, upper, lower };
}

export const INDICATOR_NOTES = [
  'MA：簡單移動平均；暖機期（不足 n 筆）顯示為空值。',
  'EMA：以前 n 筆之簡單平均作為初始值，α = 2/(n+1)。',
  'RSI(14)：Wilder 平滑（初始值為前 14 個漲跌之簡單平均，之後以 13/14 權重遞延）。',
  'MACD(12,26,9)：DIF = EMA12 − EMA26；訊號線 = DIF 之 EMA9；柱狀值 = DIF − 訊號線（未乘以 2；部分看盤軟體會乘 2）。',
  'KD(9,3,3)：K、D 初始值為 50；K = 2/3·前K + 1/3·RSV，D = 2/3·前D + 1/3·K。初期數值受初始值影響。',
  '布林通道(20,2)：中線 SMA20，上下軌 ± 2 倍母體標準差。',
  '指標以分析區間前的歷史資料暖機；區間統計僅使用選定期間資料。',
];

/** 計算單一股票全部指標（輸入需為同一股票、依日期排序之紀錄） */
export function computeIndicators(records, { histMultiplier = 1 } = {}) {
  const symbols = new Set(records.map((r) => r.symbol));
  if (symbols.size > 1) throw new Error('指標計算只接受單一股票資料，偵測到多個股票代碼');
  const c = records.map((r) => r.close);
  const h = records.map((r) => r.high);
  const l = records.map((r) => r.low);
  const m = macd(c, 12, 26, 9, histMultiplier);
  const k = kd(h, l, c);
  const b = bollinger(c);
  return {
    ma5: sma(c, 5),
    ma20: sma(c, 20),
    ma60: sma(c, 60),
    rsi14: rsi(c, 14),
    dif: m.dif,
    signal: m.signal,
    hist: m.hist,
    k: k.k,
    d: k.d,
    bbMid: b.mid,
    bbUpper: b.upper,
    bbLower: b.lower,
  };
}

export const WARMUP = { ma5: 5, ma20: 20, ma60: 60, rsi14: 15, dif: 26, signal: 34, hist: 34, k: 9, d: 9, bbMid: 20 };

/** 檢查歷史資料不足的指標 */
export function insufficiencyNotes(length) {
  const notes = [];
  const items = [
    ['MA5', 5],
    ['MA20', 20],
    ['MA60', 60],
    ['RSI(14)', 15],
    ['MACD DIF', 26],
    ['MACD 訊號線', 34],
    ['KD(9)', 9],
    ['布林通道(20)', 20],
  ];
  for (const [name, need] of items) if (length < need) notes.push(`${name} 需至少 ${need} 筆資料，目前僅 ${length} 筆，無法計算。`);
  return notes;
}
