// CSV 匯入：解碼、解析、標題列偵測、欄位自動對應
import Papa from 'papaparse';

export const FIELD_ALIASES = {
  date: ['日期', '交易日期', '資料日期', 'date', 'trade date', 'tradedate'],
  open: ['開盤價', '開盤', 'open', 'open price'],
  high: ['最高價', '最高', 'high', 'high price'],
  low: ['最低價', '最低', 'low', 'low price'],
  close: ['收盤價', '收盤', 'close', 'close price', 'adj close'],
  volume: ['成交量', '交易量', '成交股數', '成交張數', 'volume', 'vol'],
  symbol: ['股票代碼', '證券代號', '代號', '代碼', 'symbol', 'ticker', 'stock_id', 'code'],
  name: ['股票名稱', '證券名稱', '名稱', 'name', 'stock_name'],
};

const norm = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .replace(/^\uFEFF/, '')
    .replace(/[\s"'()（）]/g, '')
    .toLowerCase();

/** 依別名自動對應欄位；回傳 { field: index|-1 } */
export function autoMap(headers) {
  const mapping = {};
  const used = new Set();
  const nh = headers.map(norm);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    mapping[field] = -1;
    const na = aliases.map(norm);
    // 先精確比對，再包含比對
    let idx = nh.findIndex((h, i) => !used.has(i) && na.includes(h));
    if (idx === -1) idx = nh.findIndex((h, i) => !used.has(i) && h && na.some((a) => a.length >= 2 && h.includes(a)));
    // 避免「收盤價」被「最高價」包含之類誤判 → 已精確優先
    if (idx !== -1) {
      mapping[field] = idx;
      used.add(idx);
    }
  }
  return mapping;
}

/** 由欄位名稱推測成交量單位；無法判斷回傳 '未知' */
export function guessVolumeUnit(header) {
  const h = String(header ?? '');
  if (/股數|\(股\)|（股）|shares/i.test(h)) return '股';
  if (/張數|\(張\)|（張）|lots?/i.test(h)) return '張';
  return '未知';
}

/** 找出標題列（前 15 列中，符合核心欄位別名最多者，至少 3 個） */
export function detectHeaderRow(rows) {
  let best = -1;
  let bestScore = 0;
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const m = autoMap(rows[i]);
    const score = ['date', 'open', 'high', 'low', 'close', 'volume'].filter((f) => m[f] !== -1).length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return bestScore >= 3 ? best : -1;
}

/** 從標題前的說明列推測股票代碼與名稱（如證交所「113年01月 2330 台積電 各日成交資訊」） */
export function guessSymbolFromTitle(rows, headerIdx) {
  for (let i = 0; i < Math.max(0, headerIdx); i++) {
    const text = rows[i].join(' ');
    const m = text.match(/(?:^|[\s年月])(\d{4,6}[A-Z]?)\s*([^\s\d(（][^\s(（]{0,15})/);
    if (m) return { symbol: m[1], name: m[2].replace(/各日成交資訊.*/, '') };
  }
  return null;
}

/** 依指定編碼解碼（實際使用 TextDecoder，支援 utf-8 / big5） */
export function decodeBuffer(buffer, encoding = 'utf-8') {
  const dec = new TextDecoder(encoding, { fatal: false });
  const text = dec.decode(buffer);
  return text.replace(/^﻿/, '');
}

/** 估計亂碼程度：替代字元比例 */
export function replacementRatio(text) {
  if (!text) return 0;
  const n = (text.match(/�/g) || []).length;
  return n / text.length;
}

/** 解析 CSV 文字 */
export function parseCsvText(text, maxRows = 50000) {
  const res = Papa.parse(text, { header: false, skipEmptyLines: 'greedy' });
  const rows = res.data.map((r) => r.map((c) => (c == null ? '' : String(c))));
  const truncated = rows.length > maxRows + 20;
  return {
    rows: truncated ? rows.slice(0, maxRows + 20) : rows,
    truncated,
    parseErrors: res.errors.slice(0, 20).map((e) => `第 ${e.row + 1} 列：${e.message}`),
  };
}

/** 準備匯入預覽結構 */
export function prepareTable(rows, headerIdx) {
  const h = headerIdx >= 0 ? headerIdx : 0;
  const headers = headerIdx >= 0 ? rows[h].map((x) => String(x).trim()) : rows[0].map((_, i) => `欄${i + 1}`);
  const body = headerIdx >= 0 ? rows.slice(h + 1) : rows;
  const mapping = autoMap(headers);
  const volHeader = mapping.volume >= 0 ? headers[mapping.volume] : '';
  return {
    headers,
    body,
    mapping,
    rowOffset: (headerIdx >= 0 ? h + 1 : 0) + 1, // 對應原檔列號（1-based）
    volumeUnitGuess: guessVolumeUnit(volHeader),
    titleGuess: guessSymbolFromTitle(rows, headerIdx),
  };
}
