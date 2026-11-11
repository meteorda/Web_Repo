// CSV 匯出：UTF-8 BOM（Excel 相容）、CRLF、雙引號跳脫、公式注入防護

/** 文字欄位若以 = + - @ Tab CR 開頭，前置單引號避免被試算表當公式執行 */
export function sanitizeCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {object[]} rows
 * @param {{key:string,label:string,format?:(v:any,row:object)=>any}[]} columns
 */
export function toCsv(rows, columns, { bom = true } = {}) {
  const lines = [columns.map((c) => sanitizeCell(c.label)).join(',')];
  for (const r of rows) lines.push(columns.map((c) => sanitizeCell(c.format ? c.format(r[c.key], r) : r[c.key])).join(','));
  return (bom ? '﻿' : '') + lines.join('\r\n') + '\r\n';
}

const round = (d) => (v) => (v === null || v === undefined || !Number.isFinite(v) ? '' : Math.round(v * 10 ** d) / 10 ** d);

export function quoteColumns(volumeUnit) {
  return [
    { key: 'symbol', label: '股票代碼' },
    { key: 'name', label: '股票名稱' },
    { key: 'date', label: '日期(YYYY-MM-DD)' },
    { key: 'open', label: '開盤價' },
    { key: 'high', label: '最高價' },
    { key: 'low', label: '最低價' },
    { key: 'close', label: '收盤價' },
    { key: 'volume', label: `成交量(${volumeUnit || '單位未知'})` },
  ];
}

export const INDICATOR_COLUMNS = {
  ma: [
    { key: 'ma5', label: 'MA5', format: round(4) },
    { key: 'ma20', label: 'MA20', format: round(4) },
    { key: 'ma60', label: 'MA60', format: round(4) },
  ],
  rsi: [{ key: 'rsi14', label: 'RSI14(Wilder)', format: round(4) }],
  macd: [
    { key: 'dif', label: 'MACD_DIF', format: round(5) },
    { key: 'signal', label: 'MACD_訊號線', format: round(5) },
    { key: 'hist', label: 'MACD_柱狀值(未乘2)', format: round(5) },
  ],
  kd: [
    { key: 'k', label: 'K(9,3,3)', format: round(4) },
    { key: 'd', label: 'D(9,3,3)', format: round(4) },
  ],
  bb: [
    { key: 'bbUpper', label: '布林上軌(20,2)', format: round(4) },
    { key: 'bbMid', label: '布林中軌', format: round(4) },
    { key: 'bbLower', label: '布林下軌', format: round(4) },
  ],
};

export function errorsToCsv(errors, headers) {
  const cols = [
    { key: 'row', label: '原檔列號' },
    { key: 'kind', label: '類型', format: (v) => ({ missing: '缺值', anomaly: '異常', ambiguous: '日期歧義' })[v] || v },
    { key: 'reasons', label: '原因', format: (v) => v.join('；') },
    { key: 'raw', label: `原始內容(${(headers || []).join('|')})`, format: (v) => (v || []).join('|') },
  ];
  return toCsv(errors, cols);
}

export function downloadText(text, filename, mime = 'text/csv;charset=utf-8') {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
