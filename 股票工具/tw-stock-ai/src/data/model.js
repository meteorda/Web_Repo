// 標準資料模型
// 行情紀錄：{ symbol, name, date:'YYYY-MM-DD', open, high, low, close, volume }
// 資料集：{ id, label, currency, volumeUnit, source, importedAt, isDemo, adjustmentStatus, records, cleaningLog, importSummary }

let seq = 0;

export function createDataset({
  label,
  records = [],
  currency = 'TWD',
  volumeUnit = '未知',
  source = '未知',
  importedAt = new Date().toISOString(),
  isDemo = false,
  adjustmentStatus = 'unknown',
  cleaningLog = [],
  importSummary = null,
} = {}) {
  seq += 1;
  return {
    id: `ds_${Date.now().toString(36)}_${seq}`,
    label: label || source,
    currency,
    volumeUnit,
    source,
    importedAt,
    isDemo: Boolean(isDemo),
    adjustmentStatus,
    records: sortRecords(records),
    cleaningLog,
    importSummary,
  };
}

export function sortRecords(records) {
  return [...records].sort((a, b) =>
    a.symbol === b.symbol ? (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) : a.symbol < b.symbol ? -1 : 1,
  );
}

/** 列出資料集內股票 */
export function listSymbols(dataset) {
  const map = new Map();
  for (const r of dataset?.records || []) {
    if (!map.has(r.symbol)) map.set(r.symbol, { symbol: r.symbol, name: r.name, count: 0 });
    map.get(r.symbol).count += 1;
  }
  return [...map.values()];
}

/** 取得單一股票紀錄（依日期排序），絕不混入其他股票 */
export function recordsForSymbol(dataset, symbol) {
  return (dataset?.records || [])
    .filter((r) => r.symbol === symbol)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** 回傳區間索引 [startIdx, endIdx]（含），若無資料回傳 null */
export function rangeIndices(records, start, end) {
  let s = -1;
  let e = -1;
  for (let i = 0; i < records.length; i++) {
    const d = records[i].date;
    if ((!start || d >= start) && (!end || d <= end)) {
      if (s === -1) s = i;
      e = i;
    }
  }
  return s === -1 ? null : [s, e];
}

export function isValidRecord(r) {
  return (
    r &&
    typeof r.symbol === 'string' &&
    r.symbol.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    ['open', 'high', 'low', 'close', 'volume'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]))
  );
}
