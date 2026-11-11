import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { isDoji, isHammer, isShootingStar, isBullishEngulfing, isBearishEngulfing, detectPatterns } from '../src/analysis/patterns.js';
import { computeLevels, clusterPrices, findPivots } from '../src/analysis/levels.js';
import { sanitizeCell, toCsv, quoteColumns } from '../src/export/csv.js';
import { reportToBuffer, markdownToBlocks } from '../src/export/docx.js';
import { saveState, loadState } from '../src/storage/local.js';
import { buildDemoDataset } from '../src/data/demo.js';
import { recordsForSymbol, rangeIndices } from '../src/data/model.js';
import { computeIndicators } from '../src/indicators/indicators.js';
import { computeStats } from '../src/indicators/stats.js';
import { analyzeLines, groupItemsToLines } from '../src/data/pdfImport.js';

const c = (open, high, low, close) => ({ open, high, low, close });

describe('K 線型態', () => {
  it('十字線', () => {
    expect(isDoji(c(10, 11, 9, 10.05))).toBe(true);
    expect(isDoji(c(10, 11, 9, 10.5))).toBe(false);
  });
  it('錘頭線／流星線', () => {
    expect(isHammer(c(10, 10.55, 8, 10.5))).toBe(true);
    expect(isShootingStar(c(10.5, 13, 9.95, 10))).toBe(true);
    expect(isHammer(c(10, 13, 9.95, 10.5))).toBe(false);
  });
  it('吞噬', () => {
    expect(isBullishEngulfing(c(10, 10.2, 9.4, 9.5), c(9.4, 10.4, 9.3, 10.3))).toBe(true);
    expect(isBearishEngulfing(c(9.5, 10.1, 9.4, 10), c(10.1, 10.2, 9.2, 9.3))).toBe(true);
    expect(isBullishEngulfing(c(10, 10.2, 9.4, 9.5), c(9.6, 9.9, 9.5, 9.8))).toBe(false);
  });
  it('偵測結果含日期與價格', () => {
    const recs = recordsForSymbol(buildDemoDataset(), 'DEMO01');
    const p = detectPatterns(recs, [0, recs.length - 1]);
    for (const x of p) {
      expect(x.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(x.prices.close).toBeGreaterThan(0);
    }
  });
});

describe('支撐壓力', () => {
  it('聚類', () => {
    const z = clusterPrices([{ price: 100 }, { price: 101 }, { price: 110 }].map((x) => ({ ...x, date: 'd' })), 0.015);
    expect(z.length).toBe(2);
    expect(z[0].touches).toBe(2);
  });
  it('不使用分析截止日之後的資料', () => {
    const recs = recordsForSymbol(buildDemoDataset(), 'DEMO01');
    const end = 100;
    const lv = computeLevels(recs, end);
    const pivots = findPivots(recs, end - 59, end);
    expect(pivots.every((p) => p.idx <= end - 3)).toBe(true);
    expect(lv.method).toContain('非固比 GMMA');
    const changed = recs.map((r, i) => (i > end ? { ...r, high: 9999, low: 0.01 } : r));
    expect(computeLevels(changed, end)).toEqual(lv);
  });
  it('資料不足', () => {
    const recs = recordsForSymbol(buildDemoDataset(), 'DEMO01').slice(0, 4);
    expect(computeLevels(recs, 3).insufficient).toBeTruthy();
  });
});

describe('CSV 匯出', () => {
  it('公式注入防護與跳脫', () => {
    expect(sanitizeCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(sanitizeCell('@SUM')).toBe("'@SUM");
    expect(sanitizeCell(-1.5)).toBe('-1.5');
    expect(sanitizeCell(null)).toBe('');
  });
  it('含 BOM 與單位欄名', () => {
    const csv = toCsv([{ symbol: 'A', name: '+X', date: '2024-01-02', open: 1, high: 2, low: 1, close: 2, volume: 3 }], quoteColumns('股'));
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('成交量(股)');
    expect(csv).toContain("'+X");
  });
});

describe('DOCX 匯出', () => {
  it('產生可解壓的真正 docx（含 document.xml）', async () => {
    const ds = buildDemoDataset();
    const recs = recordsForSymbol(ds, 'DEMO01');
    const range = rangeIndices(recs, recs[0].date, recs.at(-1).date);
    const ind = computeIndicators(recs);
    const e = range[1];
    const latest = Object.fromEntries(Object.entries(ind).map(([k, v]) => [k, v[e]]));
    const buf = await reportToBuffer({
      symbol: 'DEMO01',
      name: recs[0].name,
      dataset: ds,
      stats: computeStats(recs, range),
      latest,
      patterns: detectPatterns(recs, range),
      levels: computeLevels(recs, e),
      report: { isDemo: true, content: '## 標題\n- **重點** 一\n| a | b |\n|---|---|\n| 1 | 2 |\n本分析僅供參考，投資有風險。' },
    });
    expect(buf[0]).toBe(0x50); // PK
    expect(buf[1]).toBe(0x4b);
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toContain('示範內容，非即時 AI 結果');
    expect(xml).toContain('投資風險聲明');
  });
  it('Markdown 轉區塊', () => {
    expect(markdownToBlocks('# A\n- b\n\ntext').length).toBe(3);
  });
});

describe('本機儲存', () => {
  function mem() {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), _m: m };
  }
  it('不保存 API Key、不保存示範資料', () => {
    const s = mem();
    const ds = { ...buildDemoDataset(), isDemo: false, id: 'x' };
    saveState({ datasets: [ds, buildDemoDataset()], prefs: { apiKey: 'gsk_secret', theme: 'dark', groq: { key: 'k', primary: 'm' } } }, s);
    const raw = [...s._m.values()][0];
    expect(raw).not.toContain('gsk_secret');
    const loaded = loadState(s);
    expect(loaded.datasets.length).toBe(1);
    expect(loaded.prefs.apiKey).toBeUndefined();
    expect(loaded.prefs.groq.key).toBeUndefined();
    expect(loaded.prefs.groq.primary).toBe('m');
  });
  it('版本不相容與容量不足', () => {
    const s = mem();
    s.setItem('twsa:v1', JSON.stringify({ version: 999, datasets: [] }));
    expect(loadState(s).warning).toMatch(/不相容/);
    const full = { setItem: () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } };
    expect(saveState({ datasets: [], prefs: {} }, full).error).toMatch(/空間不足/);
  });
});

describe('PDF 表格辨識（純邏輯）', () => {
  it('行情表格', () => {
    const lines = [
      ['2330', '台積電', '各日成交資訊'],
      ['日期', '成交股數', '開盤價', '最高價', '最低價', '收盤價'],
      ['113/01/02', '26,059,058', '590.00', '593.00', '589.00', '593.00'],
      ['113/01/03', '37,106,763', '584.00', '585.00', '576.00', '578.00'],
    ];
    const r = analyzeLines(lines, 200);
    expect(r.ok).toBe(true);
    expect(r.body.length).toBe(2);
    expect(r.mapping).toMatchObject({ date: 0, volume: 1, open: 2, close: 5 });
    expect(r.titleGuess).toEqual({ symbol: '2330', name: '台積電' });
  });
  it('財報內容不得當成行情', () => {
    const r = analyzeLines([['營業收入', '1,000,000'], ['每股盈餘', 'EPS', '10.5']], 200);
    expect(r.ok).toBe(false);
    expect(r.financialLike).toBe(true);
    expect(r.reason).toMatch(/無法據此建立 K 線/);
  });
  it('無文字層', () => {
    expect(analyzeLines([], 0).reason).toMatch(/掃描/);
  });
  it('依座標分行', () => {
    const lines = groupItemsToLines([
      { str: '收盤價', x: 100, y: 700, w: 30 },
      { str: '日期', x: 10, y: 700.5, w: 20 },
      { str: '113/01/02', x: 10, y: 680, w: 40 },
    ]);
    expect(lines[0]).toEqual(['日期', '收盤價']);
    expect(lines[1]).toEqual(['113/01/02']);
  });
  it('康熙部首相容字正規化', () => {
    const lines = groupItemsToLines([{ str: '⽇期 最⾼價', x: 0, y: 10, w: 40 }]);
    expect(lines[0]).toEqual(['日期', '最高價']);
  });
});
