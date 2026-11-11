// 區間統計（只使用選定期間內資料）
//
// 定義：
// - 日報酬 r_t = C_t / C_{t-1} − 1，僅使用區間內相鄰兩筆（區間首日不計）。
// - 日報酬標準差：樣本標準差（除以 n−1）。年化波動率 = 日標準差 × √252（假設一年 252 個交易日）。
// - 平均日內振幅 = 平均[(H_t − L_t) / C_{t-1}]，衡量單日高低價差，與報酬波動率不同。
// - 最大回撤 = min_t (C_t / max_{s≤t} C_s − 1)，以收盤價計算。
// - 區間報酬率 = 區間最後收盤 / 區間第一筆收盤 − 1。
// - 單日漲跌：最新一筆收盤相較前一交易日收盤（可使用區間外的前一交易日）。

export const TRADING_DAYS_PER_YEAR = 252;

export function mean(arr) {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null;
}

export function sampleStd(arr) {
  if (arr.length < 2) return null;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
}

export function maxDrawdown(closes, dates = []) {
  if (!closes.length) return null;
  let peak = closes[0];
  let peakIdx = 0;
  let mdd = 0;
  let res = { value: 0, peakIdx: 0, troughIdx: 0 };
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] > peak) {
      peak = closes[i];
      peakIdx = i;
    }
    const dd = closes[i] / peak - 1;
    if (dd < mdd) {
      mdd = dd;
      res = { value: dd, peakIdx, troughIdx: i };
    }
  }
  return { ...res, peakDate: dates[res.peakIdx] ?? null, troughDate: dates[res.troughIdx] ?? null };
}

export function maxConsecutiveDown(closes) {
  let best = 0;
  let cur = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] < closes[i - 1]) {
      cur += 1;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}

/**
 * @param {object[]} all 單一股票全部紀錄（依日期排序）
 * @param {[number, number]} range 區間索引（含）
 */
export function computeStats(all, range) {
  if (!range) return null;
  const [s, e] = range;
  const rec = all.slice(s, e + 1);
  const closes = rec.map((r) => r.close);
  const dates = rec.map((r) => r.date);
  const n = rec.length;

  const rets = [];
  const amps = [];
  let up = 0;
  let down = 0;
  let flat = 0;
  let maxGain = null;
  let maxLoss = null;
  for (let i = 1; i < n; i++) {
    const r = closes[i] / closes[i - 1] - 1;
    rets.push(r);
    amps.push((rec[i].high - rec[i].low) / closes[i - 1]);
    if (closes[i] > closes[i - 1]) up += 1;
    else if (closes[i] < closes[i - 1]) down += 1;
    else flat += 1;
    if (!maxGain || r > maxGain.value) maxGain = { value: r, date: dates[i] };
    if (!maxLoss || r < maxLoss.value) maxLoss = { value: r, date: dates[i] };
  }
  const std = sampleStd(rets);
  let hi = -Infinity;
  let lo = Infinity;
  let hiDate = null;
  let loDate = null;
  for (const r of rec) {
    if (r.high > hi) {
      hi = r.high;
      hiDate = r.date;
    }
    if (r.low < lo) {
      lo = r.low;
      loDate = r.date;
    }
  }
  const last = all[e];
  const prev = e > 0 ? all[e - 1] : null;
  return {
    count: n,
    startDate: dates[0],
    endDate: dates[n - 1],
    lastClose: last.close,
    prevClose: prev ? prev.close : null,
    prevDate: prev ? prev.date : null,
    dayChange: prev ? last.close - prev.close : null,
    dayChangePct: prev ? last.close / prev.close - 1 : null,
    periodReturn: n >= 2 ? closes[n - 1] / closes[0] - 1 : null,
    periodHigh: hi,
    periodHighDate: hiDate,
    periodLow: lo,
    periodLowDate: loDate,
    avgVolume: mean(rec.map((r) => r.volume)),
    avgClose: mean(closes),
    dailyReturnStd: std,
    annualizedVol: std === null ? null : std * Math.sqrt(TRADING_DAYS_PER_YEAR),
    avgIntradayAmplitude: mean(amps),
    maxGain,
    maxLoss,
    maxConsecutiveDown: maxConsecutiveDown(closes),
    maxDrawdown: maxDrawdown(closes, dates),
    upDownFlat: { up, down, flat, excluded: n > 0 ? 1 : 0 },
    returnCount: rets.length,
  };
}
