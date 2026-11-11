// 建構送往 AI 的資料摘要：只含單一股票、只到分析截止日、限制長度
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';
import { ADJUSTMENT_LABELS, LIMITS } from '../config.js';
import { INDICATOR_NOTES } from '../indicators/indicators.js';

const rd = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const pct = (v) => (v === null || v === undefined ? null : rd(v * 100, 2));

/**
 * @param {object} ctx { dataset, symbol, records(單一股票全部), range:[s,e], ind, stats, patterns, levels, recentN }
 */
export function buildPayload(ctx) {
  const { dataset, symbol, records, range, ind, stats, patterns = [], levels, recentN = LIMITS.AI_RECENT_ROWS } = ctx;
  if (!range) throw new Error('分析區間內沒有資料');
  if (records.some((r) => r.symbol !== symbol)) throw new Error('資料隔離錯誤：包含其他股票的紀錄');
  const [s, e] = range;
  const name = records[e]?.name || symbol;
  const from = Math.max(s, e - recentN + 1);
  const recent = [];
  for (let i = from; i <= e; i++) {
    const r = records[i];
    recent.push({
      日期: r.date,
      開: rd(r.open),
      高: rd(r.high),
      低: rd(r.low),
      收: rd(r.close),
      量: r.volume,
      MA5: rd(ind.ma5[i]),
      MA20: rd(ind.ma20[i]),
      RSI14: rd(ind.rsi14[i]),
      K: rd(ind.k[i]),
      D: rd(ind.d[i]),
      MACD柱: rd(ind.hist[i], 3),
    });
  }
  const latest = {
    日期: records[e].date,
    收盤: rd(records[e].close),
    MA5: rd(ind.ma5[e]),
    MA20: rd(ind.ma20[e]),
    MA60: rd(ind.ma60[e]),
    RSI14: rd(ind.rsi14[e]),
    MACD_DIF: rd(ind.dif[e], 3),
    MACD_訊號線: rd(ind.signal[e], 3),
    MACD_柱狀值_未乘2: rd(ind.hist[e], 3),
    K: rd(ind.k[e]),
    D: rd(ind.d[e]),
    布林上軌: rd(ind.bbUpper[e]),
    布林中軌: rd(ind.bbMid[e]),
    布林下軌: rd(ind.bbLower[e]),
  };
  return {
    標的: { 代碼: symbol, 名稱: name },
    資料集: {
      來源: dataset.source,
      是否為合成示範資料: dataset.isDemo,
      幣別: dataset.currency,
      成交量單位: dataset.volumeUnit,
      還原權息狀態: ADJUSTMENT_LABELS[dataset.adjustmentStatus] || '未知',
    },
    分析期間: { 起: stats.startDate, 迄: stats.endDate, 交易日數: stats.count },
    區間統計: {
      最新收盤: rd(stats.lastClose),
      前一交易日收盤: rd(stats.prevClose),
      單日漲跌: rd(stats.dayChange),
      單日漲跌幅_百分比: pct(stats.dayChangePct),
      區間報酬率_百分比: pct(stats.periodReturn),
      區間最高: rd(stats.periodHigh),
      區間最高日: stats.periodHighDate,
      區間最低: rd(stats.periodLow),
      區間最低日: stats.periodLowDate,
      平均成交量: Math.round(stats.avgVolume),
      平均收盤價: rd(stats.avgClose),
      日報酬標準差_百分比: pct(stats.dailyReturnStd),
      年化波動率_百分比_假設252日: pct(stats.annualizedVol),
      平均日內振幅_百分比: pct(stats.avgIntradayAmplitude),
      最大單日漲幅: stats.maxGain ? { 百分比: pct(stats.maxGain.value), 日期: stats.maxGain.date } : null,
      最大單日跌幅: stats.maxLoss ? { 百分比: pct(stats.maxLoss.value), 日期: stats.maxLoss.date } : null,
      最大連續下跌天數: stats.maxConsecutiveDown,
      最大回撤: stats.maxDrawdown
        ? { 百分比: pct(stats.maxDrawdown.value), 高點日: stats.maxDrawdown.peakDate, 低點日: stats.maxDrawdown.troughDate }
        : null,
      上漲下跌平盤日數: stats.upDownFlat,
    },
    最新技術指標: latest,
    近期行情: recent,
    K線型態_區間最近: patterns.slice(-8).map((p) => ({ 日期: p.date, 型態: p.name, 前段: p.context, 收: rd(p.prices.close) })),
    支撐壓力參考區: levels
      ? {
          方法: levels.method,
          支撐: (levels.supports || []).map((z) => ({ 區間: [rd(z.low), rd(z.high)], 觸及次數: z.touches })),
          壓力: (levels.resistances || []).map((z) => ({ 區間: [rd(z.low), rd(z.high)], 觸及次數: z.touches })),
          回看期間最高: rd(levels.rangeHigh),
          回看期間最低: rd(levels.rangeLow),
          不足說明: levels.insufficient || null,
        }
      : null,
    計算說明: INDICATOR_NOTES,
  };
}

/** 組合 messages，超過上限時逐步減少近期資料，仍超過則拋錯 */
export function buildMessages(ctx, type, customQuestion = '', maxChars = LIMITS.AI_MAX_INPUT_CHARS) {
  const q = String(customQuestion || '').slice(0, LIMITS.AI_CUSTOM_QUESTION_MAX);
  let recentN = ctx.recentN ?? LIMITS.AI_RECENT_ROWS;
  for (;;) {
    const payload = buildPayload({ ...ctx, recentN });
    const user = buildUserPrompt(payload, type, q);
    const total = SYSTEM_PROMPT.length + user.length;
    if (total <= maxChars) {
      return {
        payload,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: user },
        ],
        chars: total,
        recentN,
      };
    }
    if (recentN <= 5) throw new Error(`輸入內容 ${total} 字元超過上限 ${maxChars}，請縮短自訂問題。`);
    recentN = Math.max(5, Math.floor(recentN / 2));
  }
}
