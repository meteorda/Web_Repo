// K 線型態判定（僅描述外形條件，不構成買賣訊號）
//
// 名詞：實體 body = |C−O|；全幅 range = H−L；上影 upper = H − max(O,C)；下影 lower = min(O,C) − L
// 前段趨勢 context：以前一日收盤相較 6 日前收盤（5 日變化）判斷「下跌／上漲／持平」，僅作參考。

export const PATTERN_RULES = {
  doji: { name: '十字線', rule: '全幅 > 0，且實體 ≤ 全幅 × 10%' },
  hammer: { name: '錘頭線', rule: '實體 ≥ 全幅 × 5%，下影 ≥ 實體 × 2，上影 ≤ 全幅 × 10%（前段下跌時較具參考性）' },
  shootingStar: { name: '流星線', rule: '實體 ≥ 全幅 × 5%，上影 ≥ 實體 × 2，下影 ≤ 全幅 × 10%（前段上漲時較具參考性）' },
  bullishEngulfing: { name: '多頭吞噬', rule: '前一日收黑（C<O），當日收紅（C>O），當日開 ≤ 前日收、當日收 ≥ 前日開，且當日實體大於前日實體' },
  bearishEngulfing: { name: '空頭吞噬', rule: '前一日收紅（C>O），當日收黑（C<O），當日開 ≥ 前日收、當日收 ≤ 前日開，且當日實體大於前日實體' },
};

export const PATTERN_DISCLAIMER = '單一 K 線型態僅反映當日（或兩日）價格外形，不代表必然反轉，需搭配趨勢、量能與其他條件確認，不應單獨視為買賣訊號。';

function shape(r) {
  const body = Math.abs(r.close - r.open);
  const range = r.high - r.low;
  return { body, range, upper: r.high - Math.max(r.open, r.close), lower: Math.min(r.open, r.close) - r.low };
}

function trendContext(all, i) {
  if (i < 6) return '資料不足';
  const ch = all[i - 1].close / all[i - 6].close - 1;
  if (ch <= -0.02) return '前 5 日下跌';
  if (ch >= 0.02) return '前 5 日上漲';
  return '前 5 日持平';
}

export function isDoji(r) {
  const s = shape(r);
  return s.range > 0 && s.body <= s.range * 0.1;
}
export function isHammer(r) {
  const s = shape(r);
  return s.range > 0 && s.body >= s.range * 0.05 && s.lower >= s.body * 2 && s.upper <= s.range * 0.1;
}
export function isShootingStar(r) {
  const s = shape(r);
  return s.range > 0 && s.body >= s.range * 0.05 && s.upper >= s.body * 2 && s.lower <= s.range * 0.1;
}
export function isBullishEngulfing(p, c) {
  return p.close < p.open && c.close > c.open && c.open <= p.close && c.close >= p.open && c.close - c.open > p.open - p.close;
}
export function isBearishEngulfing(p, c) {
  return p.close > p.open && c.close < c.open && c.open >= p.close && c.close <= p.open && c.open - c.close > p.close - p.open;
}

/** 在區間 [s,e] 偵測型態（可使用區間前一日作為吞噬比較與趨勢參考） */
export function detectPatterns(all, range) {
  if (!range) return [];
  const [s, e] = range;
  const out = [];
  for (let i = s; i <= e; i++) {
    const r = all[i];
    const prices = { open: r.open, high: r.high, low: r.low, close: r.close };
    const ctx = trendContext(all, i);
    const push = (type) => out.push({ date: r.date, type, name: PATTERN_RULES[type].name, rule: PATTERN_RULES[type].rule, prices, context: ctx });
    if (isDoji(r)) push('doji');
    if (isHammer(r)) push('hammer');
    if (isShootingStar(r)) push('shootingStar');
    if (i > 0) {
      if (isBullishEngulfing(all[i - 1], r)) push('bullishEngulfing');
      if (isBearishEngulfing(all[i - 1], r)) push('bearishEngulfing');
    }
  }
  return out;
}
