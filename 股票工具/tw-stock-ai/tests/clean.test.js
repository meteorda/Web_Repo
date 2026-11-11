import { describe, it, expect } from 'vitest';
import { parseDate, parseNumber, cleanRows, validateOHLC } from '../src/data/clean.js';
import { autoMap, detectHeaderRow, prepareTable, parseCsvText, decodeBuffer, guessVolumeUnit } from '../src/data/csvImport.js';

describe('日期解析', () => {
  it('西元格式', () => {
    expect(parseDate('2024-01-02').date).toBe('2024-01-02');
    expect(parseDate('2024/1/2').date).toBe('2024-01-02');
    expect(parseDate('20240102').date).toBe('2024-01-02');
    expect(parseDate('2024-01-02 13:30:00').date).toBe('2024-01-02');
  });
  it('民國三位數年份自動轉換', () => {
    const r = parseDate('113/01/02');
    expect(r).toMatchObject({ date: '2024-01-02', status: 'ok', roc: true });
    expect(parseDate('113年1月2日').date).toBe('2024-01-02');
    expect(parseDate('民國113年01月02日').date).toBe('2024-01-02');
    expect(parseDate('1130102').date).toBe('2024-01-02');
  });
  it('兩位數年份為歧義，需確認', () => {
    expect(parseDate('99/01/02').status).toBe('ambiguous');
    expect(parseDate('99/01/02', 'roc').date).toBe('2010-01-02');
    expect(parseDate('24/01/02', 'ad').date).toBe('2024-01-02');
  });
  it('無效日期', () => {
    expect(parseDate('2024-02-30').status).toBe('invalid');
    expect(parseDate('113/13/01').status).toBe('invalid');
    expect(parseDate('abc').status).toBe('invalid');
    expect(parseDate('').status).toBe('invalid');
    expect(parseDate('2023-02-29').status).toBe('invalid');
    expect(parseDate('2024-02-29').date).toBe('2024-02-29');
  });
  it('不受時區影響（字串處理）', () => {
    expect(parseDate('2024-12-31').date).toBe('2024-12-31');
    expect(parseDate('2025-01-01').date).toBe('2025-01-01');
  });
});

describe('數值解析', () => {
  it('千分位與空白', () => {
    expect(parseNumber(' 1,234,567 ').value).toBe(1234567);
    expect(parseNumber('+12.5').value).toBe(12.5);
    expect(parseNumber('-3.2').value).toBe(-3.2);
  });
  it('缺值不得轉 0', () => {
    for (const t of ['', '--', 'N/A', 'NA', ' ', null, undefined]) {
      const r = parseNumber(t);
      expect(r.value).toBeNull();
      expect(r.status).toBe('missing');
    }
  });
  it('非數值', () => {
    expect(parseNumber('12a').status).toBe('invalid');
  });
});

describe('OHLC 驗證', () => {
  it('正常', () => expect(validateOHLC({ open: 10, high: 11, low: 9, close: 10.5, volume: 0 })).toEqual([]));
  it('最高價低於收盤', () => expect(validateOHLC({ open: 10, high: 10.2, low: 9, close: 10.5, volume: 1 }).length).toBeGreaterThan(0));
  it('最低價高於開盤', () => expect(validateOHLC({ open: 9, high: 11, low: 9.5, close: 10, volume: 1 }).length).toBeGreaterThan(0));
  it('價格非正、量為負', () => {
    expect(validateOHLC({ open: 0, high: 1, low: 0, close: 1, volume: 1 }).length).toBeGreaterThan(0);
    expect(validateOHLC({ open: 1, high: 1, low: 1, close: 1, volume: -5 })).toContain('成交量不得為負數');
  });
});

describe('cleanRows', () => {
  const mapping = { date: 0, open: 1, high: 2, low: 3, close: 4, volume: 5, symbol: -1, name: -1 };
  const rows = [
    ['113/01/03', '101', '103', '100', '102', '1,000'],
    ['113/01/02', '100', '102', '99', '101', '2,000'],
    ['113/01/04', '--', '103', '100', '102', '1,000'],
    ['113/01/05', '101', '100', '99', '102', '1,000'], // 最高 < 收盤
    ['113/01/02', '100', '102', '99', '101.5', '2,500'], // 重複
    ['說明：本資料僅供參考', '', '', '', '', ''],
  ];
  it('排序、缺值、異常、重複統計', () => {
    const r = cleanRows(rows, mapping, { symbol: '2330', name: '測試' });
    expect(r.records.map((x) => x.date)).toEqual(['2024-01-02', '2024-01-03']);
    expect(r.stats.missing).toBe(1);
    expect(r.stats.anomaly).toBe(1);
    expect(r.stats.duplicateGroups).toBe(1);
    expect(r.stats.skippedNonData).toBe(1);
    expect(r.records[0].close).toBe(101); // 保留第一筆
    expect(r.records[0].volume).toBe(2000);
    expect(r.stats.dateRange).toEqual(['2024-01-02', '2024-01-03']);
    // 缺值列不會變成 0
    expect(r.records.some((x) => x.open === 0)).toBe(false);
  });
  it('重複處理：保留最後／全部捨棄', () => {
    expect(cleanRows(rows, mapping, { symbol: 'X', duplicatePolicy: 'last' }).records[0].close).toBe(101.5);
    expect(cleanRows(rows, mapping, { symbol: 'X', duplicatePolicy: 'drop' }).records.map((x) => x.date)).toEqual(['2024-01-03']);
  });
  it('缺少股票代碼列為錯誤', () => {
    const r = cleanRows(rows.slice(0, 1), mapping, {});
    expect(r.records.length).toBe(0);
    expect(r.errors[0].reasons).toContain('缺少股票代碼');
  });
  it('多股票不混合', () => {
    const m2 = { ...mapping, symbol: 6 };
    const r = cleanRows(
      [
        ['2024-01-02', '10', '11', '9', '10', '1', 'B'],
        ['2024-01-02', '20', '21', '19', '20', '1', 'A'],
      ],
      m2,
    );
    expect(r.duplicates.length).toBe(0);
    expect(r.records.map((x) => x.symbol)).toEqual(['A', 'B']);
  });
  it('歧義日期需確認', () => {
    const r = cleanRows([['99/01/02', '10', '11', '9', '10', '1']], mapping, { symbol: 'X' });
    expect(r.stats.ambiguous).toBe(1);
    const r2 = cleanRows([['99/01/02', '10', '11', '9', '10', '1']], mapping, { symbol: 'X', dateMode: 'roc' });
    expect(r2.records[0].date).toBe('2010-01-02');
  });
});

describe('CSV 解析與欄位對應', () => {
  it('證交所格式：標題前有說明列', () => {
    const text = '"113年01月 2330 台積電           各日成交資訊"\n"日期","成交股數","成交金額","開盤價","最高價","最低價","收盤價","漲跌價差","成交筆數"\n"113/01/02","26,059,058","15,880,722,970","590.00","593.00","589.00","593.00","-0.00","24,394"\n';
    const { rows } = parseCsvText(text);
    const h = detectHeaderRow(rows);
    expect(h).toBe(1);
    const t = prepareTable(rows, h);
    expect(t.mapping).toMatchObject({ date: 0, volume: 1, open: 3, high: 4, low: 5, close: 6 });
    expect(t.volumeUnitGuess).toBe('股');
    expect(t.titleGuess).toEqual({ symbol: '2330', name: '台積電' });
  });
  it('英文欄位', () => {
    expect(autoMap(['Date', 'Open', 'High', 'Low', 'Close', 'Volume'])).toMatchObject({ date: 0, open: 1, high: 2, low: 3, close: 4, volume: 5 });
  });
  it('成交量單位無法判斷時回傳未知', () => {
    expect(guessVolumeUnit('Volume')).toBe('未知');
    expect(guessVolumeUnit('成交張數')).toBe('張');
  });
  it('Big5 實際解碼', () => {
    // 「日期」的 Big5 編碼：A4E9 B4C1
    const buf = new Uint8Array([0xa4, 0xe9, 0xb4, 0xc1]);
    expect(decodeBuffer(buf, 'big5')).toBe('日期');
  });
});
