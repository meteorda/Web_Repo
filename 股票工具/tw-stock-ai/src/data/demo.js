// 合成示範資料（固定亂數種子，可重現；非真實市場行情）
import { createDataset } from './model.js';

/** Mulberry32 固定種子亂數 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand) {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const r2 = (x) => Math.round(x * 100) / 100;

/** 產生平日（週一至週五）日期字串，以 UTC 計算避免時區偏移 */
export function weekdays(startISO, count) {
  const [y, m, d] = startISO.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const out = [];
  while (out.length < count) {
    const wd = t.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(t.toISOString().slice(0, 10));
    t.setUTCDate(t.getUTCDate() + 1);
  }
  return out;
}

/**
 * 產生單一合成股票行情
 * regimes: [{ days, drift, vol }]
 */
export function generateSeries({ symbol, name, seed, start = '2025-03-03', days = 160, startPrice = 100, baseVolume = 3_000_000, regimes }) {
  const rand = mulberry32(seed);
  const dates = weekdays(start, days);
  const plan = [];
  for (const rg of regimes) for (let i = 0; i < rg.days; i++) plan.push(rg);
  while (plan.length < days) plan.push(regimes[regimes.length - 1]);
  const out = [];
  let prevClose = startPrice;
  for (let i = 0; i < days; i++) {
    const { drift, vol } = plan[i];
    const gap = gaussian(rand) * vol * 0.3;
    const open = r2(prevClose * (1 + gap));
    const ret = drift + gaussian(rand) * vol;
    const close = r2(Math.max(1, prevClose * (1 + ret)));
    const hi = Math.max(open, close);
    const lo = Math.min(open, close);
    const high = r2(hi * (1 + Math.abs(gaussian(rand)) * vol * 0.5));
    const low = r2(Math.max(0.01, lo * (1 - Math.abs(gaussian(rand)) * vol * 0.5)));
    const volume = Math.round(baseVolume * (1 + Math.abs(ret) * 25) * (0.6 + rand() * 0.8));
    out.push({ symbol, name, date: dates[i], open, high: Math.max(high, hi), low: Math.min(low, lo), close, volume });
    prevClose = close;
  }
  return out;
}

export function buildDemoDataset() {
  const a = generateSeries({
    symbol: 'DEMO01',
    name: '示範科技（虛構）',
    seed: 20250303,
    startPrice: 152,
    baseVolume: 4_200_000,
    regimes: [
      { days: 50, drift: 0.0025, vol: 0.016 },
      { days: 35, drift: -0.003, vol: 0.022 },
      { days: 40, drift: 0.0005, vol: 0.012 },
      { days: 35, drift: 0.0028, vol: 0.018 },
    ],
  });
  const b = generateSeries({
    symbol: 'DEMO02',
    name: '示範航運（虛構）',
    seed: 77001,
    startPrice: 48,
    baseVolume: 9_000_000,
    regimes: [
      { days: 60, drift: -0.0015, vol: 0.025 },
      { days: 50, drift: 0.002, vol: 0.03 },
      { days: 50, drift: -0.001, vol: 0.02 },
    ],
  });
  return createDataset({
    label: '合成示範資料（非真實市場行情）',
    records: [...a, ...b],
    source: '系統合成示範資料（固定種子，非真實市場行情）',
    isDemo: true,
    volumeUnit: '股',
    adjustmentStatus: 'unknown',
    cleaningLog: ['合成資料：以固定亂數種子產生 160 個平日交易日，不含真實假日休市'],
  });
}
