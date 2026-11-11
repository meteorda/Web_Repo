// 產生範例 CSV（合成、非真實行情），含刻意的缺值／異常／重複列供清洗測試
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSeries } from '../src/data/demo.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../sample-data');
fs.mkdirSync(dir, { recursive: true });

const fmtN = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const roc = (d) => {
  const [y, m, dd] = d.split('-');
  return `${Number(y) - 1911}/${m}/${dd}`;
};

// 1) 證交所風格：民國年、千分位、標題說明列、成交股數
const a = generateSeries({ symbol: '9901', name: '範例電子（虛構）', seed: 424242, start: '2025-01-02', days: 130, startPrice: 88, baseVolume: 2_500_000, regimes: [{ days: 45, drift: 0.002, vol: 0.017 }, { days: 45, drift: -0.002, vol: 0.02 }, { days: 40, drift: 0.0015, vol: 0.015 }] });
const q = (s) => `"${s}"`;
const lines = [q('114年 9901 範例電子（虛構） 各日成交資訊（合成示範，非真實行情）'), ['日期', '成交股數', '開盤價', '最高價', '最低價', '收盤價', '漲跌價差'].map(q).join(',')];
a.forEach((r, i) => {
  const ch = i ? r.close - a[i - 1].close : 0;
  lines.push([roc(r.date), r.volume.toLocaleString('en-US'), fmtN(r.open), fmtN(r.high), fmtN(r.low), fmtN(r.close), (ch >= 0 ? '+' : '') + ch.toFixed(2)].map(q).join(','));
});
// 刻意錯誤
lines.push([roc('2025-07-15'), '1,000', '--', '90.00', '88.00', '89.00', 'X'].map(q).join(',')); // 缺值
lines.push([roc('2025-07-16'), '1,000', '90.00', '89.00', '88.00', '89.50', '0'].map(q).join(',')); // 最高 < 開盤
lines.push([roc(a[10].date), '999', fmtN(a[10].open), fmtN(a[10].high), fmtN(a[10].low), fmtN(a[10].close), '0'].map(q).join(',')); // 重複日期
lines.push(['114/02/30', '1,000', '90.00', '91.00', '88.00', '89.00', '0'].map(q).join(',')); // 無效日期
lines.push(q('說明：本檔為系統合成範例資料，非真實市場行情。'));
fs.writeFileSync(path.join(dir, 'sample_twse_style_9901.csv'), '﻿' + lines.join('\r\n') + '\r\n');

// 2) 英文欄位、多股票、西元年
const b = generateSeries({ symbol: 'SAMPLEA', name: 'Sample A (fictional)', seed: 1, start: '2025-02-03', days: 125, startPrice: 30, regimes: [{ days: 125, drift: 0.001, vol: 0.02 }] });
const c = generateSeries({ symbol: 'SAMPLEB', name: 'Sample B (fictional)', seed: 2, start: '2025-02-03', days: 125, startPrice: 210, regimes: [{ days: 125, drift: -0.0008, vol: 0.015 }] });
const l2 = ['Symbol,Name,Date,Open,High,Low,Close,Volume'];
for (const r of [...b, ...c]) l2.push([r.symbol, r.name, r.date, r.open, r.high, r.low, r.close, r.volume].join(','));
fs.writeFileSync(path.join(dir, 'sample_multi_stock.csv'), l2.join('\n') + '\n');

console.log('已產生 sample-data/sample_twse_style_9901.csv 與 sample_multi_stock.csv');
