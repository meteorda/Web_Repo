// 報告渲染：Markdown → 清理後 HTML；示範報告（程式範本，非 AI）
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdownSafe(md) {
  const html = marked.parse(String(md || ''), { async: false });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'iframe', 'form', 'input'], FORBID_ATTR: ['style'] });
}

const f2 = (v) => (v === null || v === undefined ? '無法計算' : Number(v).toFixed(2));
const p2 = (v) => (v === null || v === undefined ? '無法計算' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`);

/** 示範報告：以程式範本搭配實際計算數值，明確標示非 AI 結果 */
export function buildDemoReport({ symbol, name, stats, latest, levels, dataset }) {
  const trendShort = latest.ma5 !== null && latest.ma20 !== null ? (latest.ma5 > latest.ma20 ? 'MA5 位於 MA20 之上' : 'MA5 位於 MA20 之下') : 'MA5／MA20 資料不足';
  const trendLong = latest.ma60 !== null ? (stats.lastClose > latest.ma60 ? '收盤高於 MA60' : '收盤低於 MA60') : 'MA60 資料不足（需 60 筆）';
  const sup = levels?.supports?.[0];
  const res = levels?.resistances?.[0];
  return `> **示範內容，非即時 AI 結果**：本段由程式範本依計算數值自動填入，未呼叫任何 AI 模型。

## 1. 分析標的、資料來源與期間
- 標的：${symbol} ${name}
- 來源：${dataset.source}${dataset.isDemo ? '（合成示範資料，非真實市場行情）' : ''}
- 期間：${stats.startDate} ～ ${stats.endDate}，共 ${stats.count} 個交易日

## 2. 重點摘要
- 最新收盤 ${f2(stats.lastClose)}，單日漲跌 ${p2(stats.dayChangePct)}，區間報酬 ${p2(stats.periodReturn)}。
- 短期：${trendShort}；長期：${trendLong}。

## 3. 數據與技術訊號
| 指標 | 數值 |
|---|---|
| RSI(14) | ${f2(latest.rsi14)} |
| K / D | ${f2(latest.k)} / ${f2(latest.d)} |
| MACD 柱狀值 | ${f2(latest.hist)} |
| 日報酬標準差 | ${stats.dailyReturnStd === null ? '無法計算' : `${(stats.dailyReturnStd * 100).toFixed(2)}%`} |
| 最大回撤 | ${p2(stats.maxDrawdown?.value)} |

## 4. 範本說明
此區在真實 AI 分析時會依所選類型產生解讀；示範模式僅列出程式計算結果。

## 5. 情境與失效條件
- 支撐參考：${sup ? `${f2(sup.low)}～${f2(sup.high)}（觸及 ${sup.touches} 次）` : '無'}；壓力參考：${res ? `${f2(res.low)}～${f2(res.high)}（觸及 ${res.touches} 次）` : '無'}。
- 範本不提供條件推論。

## 6. 資料限制及信心程度
- 還原權息狀態：${{ adjusted: '已還原', unadjusted: '未還原', unknown: '未知' }[dataset.adjustmentStatus]}。
- 示範內容不評估信心程度。

## 7. 投資風險聲明
本分析僅供參考，投資有風險。`;
}
