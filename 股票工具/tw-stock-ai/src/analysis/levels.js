// 支撐壓力參考區：局部高低點聚類（非固比 GMMA）
//
// 方法：
// 1. 回看期間：分析截止日（含）往前 lookback 個交易日。
// 2. 局部高點：最高價為 [i−k, i+k] 窗口內最大值；局部低點同理（最低價）。
//    右側 k 日必須在截止日以前，因此最後 k 日不會被認定為轉折點（避免使用未來資料）。
// 3. 將所有轉折價由小到大排序，相鄰價差 ≤ 容忍度（預設 1.5%）者併為同一區。
// 4. 區中心低於最新收盤 → 支撐參考區；高於 → 壓力參考區；依觸及次數與距離排序取前 3。
// 5. 另提供回看期間的最高價與最低價。

export function findPivots(all, startIdx, endIdx, k = 3) {
  const pivots = [];
  for (let i = startIdx + k; i <= endIdx - k; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (all[j].high > all[i].high) isHigh = false;
      if (all[j].low < all[i].low) isLow = false;
    }
    if (isHigh) pivots.push({ type: 'high', price: all[i].high, date: all[i].date, idx: i });
    if (isLow) pivots.push({ type: 'low', price: all[i].low, date: all[i].date, idx: i });
  }
  return pivots;
}

export function clusterPrices(pivots, tolerance = 0.015) {
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const clusters = [];
  for (const p of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && (p.price - last.max) / last.max <= tolerance) {
      last.members.push(p);
      last.max = p.price;
    } else clusters.push({ min: p.price, max: p.price, members: [p] });
  }
  return clusters.map((c) => ({
    low: c.min,
    high: c.max,
    center: c.members.reduce((s, m) => s + m.price, 0) / c.members.length,
    touches: c.members.length,
    dates: c.members.map((m) => m.date).sort(),
  }));
}

export function computeLevels(all, endIdx, { lookback = 60, k = 3, tolerance = 0.015 } = {}) {
  if (endIdx === null || endIdx === undefined || endIdx < 0) return null;
  const startIdx = Math.max(0, endIdx - lookback + 1);
  const used = endIdx - startIdx + 1;
  const method = `局部高低點聚類：回看 ${used} 個交易日（${all[startIdx].date} ～ ${all[endIdx].date}），轉折窗口 ±${k} 日，價差 ≤ ${(tolerance * 100).toFixed(1)}% 併為同區；僅使用分析截止日以前資料。此為一般支撐壓力演算法，非固比 GMMA。`;
  if (used < 2 * k + 1) return { method, supports: [], resistances: [], insufficient: `資料僅 ${used} 筆，不足以辨識轉折點（至少需 ${2 * k + 1} 筆）。` };
  const last = all[endIdx].close;
  const pivots = findPivots(all, startIdx, endIdx, k);
  const clusters = clusterPrices(pivots, tolerance);
  const rank = (a, b) => b.touches - a.touches || Math.abs(a.center - last) - Math.abs(b.center - last);
  const supports = clusters.filter((c) => c.center < last).sort(rank).slice(0, 3).sort((a, b) => b.center - a.center);
  const resistances = clusters.filter((c) => c.center > last).sort(rank).slice(0, 3).sort((a, b) => a.center - b.center);
  let hi = -Infinity;
  let lo = Infinity;
  for (let i = startIdx; i <= endIdx; i++) {
    hi = Math.max(hi, all[i].high);
    lo = Math.min(lo, all[i].low);
  }
  return { method, lookbackDays: used, lastClose: last, supports, resistances, rangeHigh: hi, rangeLow: lo, pivotCount: pivots.length };
}
