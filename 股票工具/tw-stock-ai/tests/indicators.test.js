import { describe, it, expect } from 'vitest';
import { sma, ema, rsi, macd, kd, bollinger, computeIndicators, insufficiencyNotes } from '../src/indicators/indicators.js';
import { computeStats, maxDrawdown, maxConsecutiveDown, sampleStd } from '../src/indicators/stats.js';
import { buildDemoDataset } from '../src/data/demo.js';
import { recordsForSymbol, rangeIndices } from '../src/data/model.js';
import { validateOHLC } from '../src/data/clean.js';

describe('SMA / EMA', () => {
  it('SMA 暖機期為 null 而非 0', () => {
    const r = sma([1, 2, 3, 4, 5], 3);
    expect(r).toEqual([null, null, 2, 3, 4]);
  });
  it('EMA 以 SMA 為初始值', () => {
    const r = ema([1, 2, 3, 4, 5], 3);
    expect(r[0]).toBeNull();
    expect(r[1]).toBeNull();
    expect(r[2]).toBe(2);
    expect(r[3]).toBeCloseTo(0.5 * 4 + 0.5 * 2, 10);
    expect(r[4]).toBeCloseTo(0.5 * 5 + 0.5 * 3, 10);
  });
});

describe('RSI (Wilder)', () => {
  it('前 14 筆為 null，第 15 筆起有值', () => {
    const c = Array.from({ length: 20 }, (_, i) => 100 + i);
    const r = rsi(c, 14);
    expect(r.slice(0, 14).every((x) => x === null)).toBe(true);
    expect(r[14]).toBe(100); // 全漲
  });
  it('已知數列手算', () => {
    // 交替 +2 / -1，14 個變動：7 個 +2、7 個 -1
    const c = [100];
    for (let i = 0; i < 15; i++) c.push(c[c.length - 1] + (i % 2 === 0 ? 2 : -1));
    const r = rsi(c, 14);
    const avgG = 14 / 14;
    const avgL = 7 / 14;
    expect(r[14]).toBeCloseTo(100 - 100 / (1 + avgG / avgL), 10);
    // 第 15 個變動為 +2 → Wilder 遞延
    const g2 = (avgG * 13 + 2) / 14;
    const l2 = (avgL * 13 + 0) / 14;
    expect(r[15]).toBeCloseTo(100 - 100 / (1 + g2 / l2), 10);
  });
  it('平盤 RSI = 50', () => {
    expect(rsi(Array(20).fill(10), 14)[19]).toBe(50);
  });
});

describe('MACD 初始條件', () => {
  const c = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5 + i * 0.2);
  const m = macd(c);
  it('DIF 自第 26 筆起（index 25）', () => {
    expect(m.dif[24]).toBeNull();
    expect(m.dif[25]).not.toBeNull();
  });
  it('訊號線自 index 33 起，為 DIF 前 9 筆平均', () => {
    expect(m.signal[32]).toBeNull();
    const avg = m.dif.slice(25, 34).reduce((s, x) => s + x, 0) / 9;
    expect(m.signal[33]).toBeCloseTo(avg, 10);
    expect(m.hist[33]).toBeCloseTo(m.dif[33] - m.signal[33], 10);
  });
  it('柱狀值可設定乘 2', () => {
    const m2 = macd(c, 12, 26, 9, 2);
    expect(m2.hist[40]).toBeCloseTo(m.hist[40] * 2, 10);
  });
});

describe('KD 初始條件', () => {
  it('K、D 以 50 起算，前 8 筆為 null', () => {
    const h = Array.from({ length: 12 }, (_, i) => 12 + i);
    const l = Array.from({ length: 12 }, (_, i) => 8 + i);
    const c = Array.from({ length: 12 }, (_, i) => 11 + i);
    const r = kd(h, l, c);
    expect(r.k.slice(0, 8).every((x) => x === null)).toBe(true);
    const rsv = ((c[8] - 8) / (h[8] - 8)) * 100;
    expect(r.k[8]).toBeCloseTo((2 / 3) * 50 + rsv / 3, 10);
    expect(r.d[8]).toBeCloseTo((2 / 3) * 50 + r.k[8] / 3, 10);
  });
  it('H9 = L9 時 RSV = 50', () => {
    const r = kd(Array(9).fill(10), Array(9).fill(10), Array(9).fill(10));
    expect(r.rsv[8]).toBe(50);
  });
});

describe('布林通道', () => {
  it('母體標準差', () => {
    const c = Array.from({ length: 20 }, (_, i) => i + 1);
    const b = bollinger(c);
    const m = 10.5;
    const sd = Math.sqrt(c.reduce((s, x) => s + (x - m) ** 2, 0) / 20);
    expect(b.mid[19]).toBe(m);
    expect(b.upper[19]).toBeCloseTo(m + 2 * sd, 10);
    expect(b.lower[18]).toBeNull();
  });
});

describe('統計', () => {
  it('最大回撤', () => {
    const r = maxDrawdown([100, 120, 90, 110, 80, 130], ['a', 'b', 'c', 'd', 'e', 'f']);
    expect(r.value).toBeCloseTo(80 / 120 - 1, 10);
    expect(r.peakDate).toBe('b');
    expect(r.troughDate).toBe('e');
  });
  it('只漲不跌回撤為 0', () => {
    expect(maxDrawdown([1, 2, 3]).value).toBe(0);
  });
  it('最大連續下跌天數', () => {
    expect(maxConsecutiveDown([10, 9, 8, 9, 8, 7, 6, 7])).toBe(3);
  });
  it('樣本標準差', () => {
    expect(sampleStd([1, 2, 3, 4])).toBeCloseTo(Math.sqrt(5 / 3), 10);
    expect(sampleStd([1])).toBeNull();
  });
  it('區間統計僅使用選定區間', () => {
    const all = [
      { date: 'd1', open: 50, high: 200, low: 1, close: 50, volume: 9999 },
      { date: 'd2', open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { date: 'd3', open: 10, high: 12, low: 9, close: 11, volume: 200 },
    ];
    const s = computeStats(all, [1, 2]);
    expect(s.periodHigh).toBe(12);
    expect(s.periodLow).toBe(9);
    expect(s.avgVolume).toBe(150);
    expect(s.periodReturn).toBeCloseTo(0.1, 10);
    expect(s.returnCount).toBe(1);
    // 單日漲跌可使用前一交易日
    expect(s.dayChangePct).toBeCloseTo(0.1, 10);
  });
  it('缺少前一交易日時單日漲跌為 null', () => {
    const s = computeStats([{ date: 'd1', open: 1, high: 1, low: 1, close: 1, volume: 1 }], [0, 0]);
    expect(s.dayChangePct).toBeNull();
    expect(s.periodReturn).toBeNull();
    expect(s.dailyReturnStd).toBeNull();
  });
});

describe('資料不足', () => {
  it('列出不足的指標', () => {
    const notes = insufficiencyNotes(30);
    expect(notes.some((n) => n.includes('MA60'))).toBe(true);
    expect(notes.some((n) => n.includes('MACD 訊號線'))).toBe(true);
    expect(notes.some((n) => n.includes('MA20'))).toBe(false);
  });
  it('資料少於 60 筆時 MA60 全為 null', () => {
    const recs = Array.from({ length: 30 }, (_, i) => ({ symbol: 'A', date: `2024-01-${String(i + 1).padStart(2, '0')}`, open: 10, high: 11, low: 9, close: 10 + i * 0.1, volume: 1 }));
    const ind = computeIndicators(recs);
    expect(ind.ma60.every((x) => x === null)).toBe(true);
    expect(ind.ma60.includes(0)).toBe(false);
  });
  it('多股票混算時拒絕計算', () => {
    expect(() =>
      computeIndicators([
        { symbol: 'A', close: 1, high: 1, low: 1 },
        { symbol: 'B', close: 1, high: 1, low: 1 },
      ]),
    ).toThrow();
  });
});

describe('示範資料', () => {
  it('可重現、筆數足夠、符合 OHLC', () => {
    const a = buildDemoDataset();
    const b = buildDemoDataset();
    expect(a.records).toEqual(b.records);
    const s1 = recordsForSymbol(a, 'DEMO01');
    expect(s1.length).toBeGreaterThanOrEqual(120);
    expect(a.records.every((r) => validateOHLC(r).length === 0)).toBe(true);
    expect(a.isDemo).toBe(true);
    expect(a.records.every((r) => r.name.includes('虛構'))).toBe(true);
  });
  it('rangeIndices', () => {
    const recs = recordsForSymbol(buildDemoDataset(), 'DEMO01');
    const r = rangeIndices(recs, recs[10].date, recs[20].date);
    expect(r).toEqual([10, 20]);
    expect(rangeIndices(recs, '2000-01-01', '2000-01-02')).toBeNull();
  });
});
