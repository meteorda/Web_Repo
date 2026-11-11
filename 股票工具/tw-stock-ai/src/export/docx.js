// Word 報告：以 docx 套件產生真正的 .docx
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  ShadingType,
  BorderStyle,
} from 'docx';
import { ADJUSTMENT_LABELS, RISK_DISCLAIMER } from '../config.js';
import { INDICATOR_NOTES } from '../indicators/indicators.js';
import { PATTERN_DISCLAIMER } from '../analysis/patterns.js';

const FONT = 'Microsoft JhengHei';
const f = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '無法計算' : Number(v).toFixed(d));
const pa = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '無法計算' : `${(v * 100).toFixed(2)}%`);
const p = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '無法計算' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`);

/** 解析 **粗體** 與 `code` 為 TextRun */
export function inlineRuns(text, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  const s = String(text);
  while ((m = re.exec(s))) {
    if (m.index > last) runs.push(new TextRun({ text: s.slice(last, m.index), font: FONT, ...base }));
    const tok = m[0];
    if (tok.startsWith('**')) runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, font: FONT, ...base }));
    else runs.push(new TextRun({ text: tok.slice(1, -1), font: 'Consolas', ...base }));
    last = m.index + tok.length;
  }
  if (last < s.length) runs.push(new TextRun({ text: s.slice(last), font: FONT, ...base }));
  return runs.length ? runs : [new TextRun({ text: '', font: FONT })];
}

function cell(text, { header = false, width } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F39C12' } : undefined,
    children: [new Paragraph({ children: inlineRuns(String(text ?? ''), header ? { bold: true, color: 'FFFFFF' } : {}) })],
  });
}

export function makeTable(rows, { headerRow = true } = {}) {
  const borders = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: borders, bottom: borders, left: borders, right: borders, insideHorizontal: borders, insideVertical: borders },
    rows: rows.map((r, i) => new TableRow({ children: r.map((c) => cell(c, { header: headerRow && i === 0 })) })),
  });
}

/** 簡易 Markdown → docx 區塊（標題、清單、表格、引言、段落） */
export function markdownToBlocks(md) {
  const blocks = [];
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const tbl = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) tbl.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        i++;
      }
      const w = Math.max(...tbl.map((r) => r.length));
      blocks.push(makeTable(tbl.map((r) => [...r, ...Array(w - r.length).fill('')])));
      blocks.push(new Paragraph({ text: '' }));
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      const lvl = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][Math.min(m[1].length + 1, 6) - 1];
      blocks.push(new Paragraph({ heading: lvl, children: inlineRuns(m[2]) }));
    } else if ((m = line.match(/^(\s*)[-*+]\s+(.*)$/))) {
      blocks.push(new Paragraph({ bullet: { level: Math.min(2, Math.floor(m[1].length / 2)) }, children: inlineRuns(m[2]) }));
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      blocks.push(new Paragraph({ children: inlineRuns(`${m[1]}. ${m[2]}`), indent: { left: 360 } }));
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      blocks.push(new Paragraph({ children: inlineRuns(m[1], { italics: true, color: '666666' }), indent: { left: 360 } }));
    } else if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      // 分隔線略過
    } else if (line.trim()) {
      blocks.push(new Paragraph({ children: inlineRuns(line.replace(/^#+/, '')) }));
    }
    i++;
  }
  return blocks;
}

function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
    return out;
  }
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

/**
 * @param {object} info { symbol, name, dataset, stats, latest, patterns, levels, report:{ content, isDemo, model, usage, clientTotalMs, generatedAt, analysisLabel, usedFallback, truncated }, charts:[{title,dataUrl,width,height}], chartNote }
 */
export function buildReportDocument(info) {
  const { symbol, name, dataset, stats, latest, patterns = [], levels, report, charts = [], chartNote } = info;
  const kids = [];
  kids.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${symbol} ${name} 個股資料分析報告`, font: FONT, bold: true })] }));
  const label = report?.isDemo ? '【示範內容，非即時 AI 結果】' : report ? '【Groq AI 即時分析結果】' : '【未包含 AI 分析】';
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, bold: true, color: report?.isDemo ? 'C0392B' : '1F6FB2', font: FONT })] }));
  if (dataset.isDemo) kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '資料為合成示範資料，非真實市場行情', color: 'C0392B', font: FONT })] }));

  kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns('一、股票與資料資訊') }));
  kids.push(
    makeTable([
      ['項目', '內容'],
      ['股票代碼／名稱', `${symbol}／${name}`],
      ['資料來源', dataset.source],
      ['分析期間', `${stats.startDate} ～ ${stats.endDate}（${stats.count} 個交易日）`],
      ['幣別', dataset.currency],
      ['成交量單位', dataset.volumeUnit],
      ['還原權息狀態', ADJUSTMENT_LABELS[dataset.adjustmentStatus] || '未知'],
      ['報告產生時間', report?.generatedAt || new Date().toLocaleString('zh-TW', { hour12: false })],
    ]),
  );

  kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns('二、行情摘要') }));
  kids.push(
    makeTable([
      ['指標', '數值', '說明'],
      ['最新收盤', f(stats.lastClose), stats.endDate],
      ['單日漲跌（幅）', `${f(stats.dayChange)}（${p(stats.dayChangePct)}）`, stats.prevDate ? `相較 ${stats.prevDate}` : '缺少前一交易日，無法計算'],
      ['區間報酬率', p(stats.periodReturn), '區間末筆收盤 / 區間首筆收盤 − 1'],
      ['區間最高／最低', `${f(stats.periodHigh)}／${f(stats.periodLow)}`, `${stats.periodHighDate}／${stats.periodLowDate}`],
      ['平均成交量', f(stats.avgVolume, 0), dataset.volumeUnit],
      ['平均收盤價', f(stats.avgClose), ''],
      ['日報酬標準差', pa(stats.dailyReturnStd), '樣本標準差'],
      ['年化波動率', pa(stats.annualizedVol), '× √252（假設一年 252 交易日）'],
      ['平均日內振幅', pa(stats.avgIntradayAmplitude), '(最高−最低)/前日收盤，非報酬波動率'],
      ['最大單日漲幅', stats.maxGain ? `${p(stats.maxGain.value)}` : '無法計算', stats.maxGain?.date || ''],
      ['最大單日跌幅', stats.maxLoss ? `${p(stats.maxLoss.value)}` : '無法計算', stats.maxLoss?.date || ''],
      ['最大連續下跌天數', String(stats.maxConsecutiveDown), ''],
      ['最大回撤', p(stats.maxDrawdown?.value), stats.maxDrawdown ? `${stats.maxDrawdown.peakDate} → ${stats.maxDrawdown.troughDate}` : ''],
    ]),
  );

  kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns('三、最新技術指標') }));
  kids.push(
    makeTable([
      ['指標', '數值'],
      ['MA5 / MA20 / MA60', `${f(latest.ma5)} / ${f(latest.ma20)} / ${f(latest.ma60)}`],
      ['RSI(14, Wilder)', f(latest.rsi14)],
      ['MACD DIF / 訊號線 / 柱狀值(未乘2)', `${f(latest.dif, 3)} / ${f(latest.signal, 3)} / ${f(latest.hist, 3)}`],
      ['K / D (9,3,3)', `${f(latest.k)} / ${f(latest.d)}`],
      ['布林上 / 中 / 下 (20,2)', `${f(latest.bbUpper)} / ${f(latest.bbMid)} / ${f(latest.bbLower)}`],
    ]),
  );
  for (const n of INDICATOR_NOTES) kids.push(new Paragraph({ bullet: { level: 0 }, children: inlineRuns(n, { size: 18 }) }));

  kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns('四、K 線型態與支撐壓力') }));
  if (patterns.length) {
    kids.push(makeTable([['日期', '型態', '前段', '開/高/低/收'], ...patterns.slice(-15).map((x) => [x.date, x.name, x.context, `${f(x.prices.open)}/${f(x.prices.high)}/${f(x.prices.low)}/${f(x.prices.close)}`])]));
  } else kids.push(new Paragraph({ children: inlineRuns('區間內未偵測到設定的型態。') }));
  kids.push(new Paragraph({ children: inlineRuns(PATTERN_DISCLAIMER, { italics: true, size: 18 }) }));
  if (levels) {
    kids.push(new Paragraph({ children: inlineRuns(`方法：${levels.method}`, { size: 18 }) }));
    if (levels.insufficient) kids.push(new Paragraph({ children: inlineRuns(levels.insufficient) }));
    const zrow = (t, z) => [t, `${f(z.low)} ～ ${f(z.high)}`, String(z.touches)];
    kids.push(makeTable([['類型', '參考區', '觸及次數'], ...(levels.supports || []).map((z) => zrow('支撐', z)), ...(levels.resistances || []).map((z) => zrow('壓力', z))]));
  }

  if (charts.length) {
    kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns('五、圖表') }));
    for (const c of charts) {
      try {
        const w = 600;
        const h = Math.round((c.height / c.width) * w) || 300;
        kids.push(new Paragraph({ children: inlineRuns(c.title, { bold: true }) }));
        kids.push(new Paragraph({ children: [new ImageRun({ type: 'png', data: dataUrlToBytes(c.dataUrl), transformation: { width: w, height: h } })] }));
      } catch {
        kids.push(new Paragraph({ children: inlineRuns(`（${c.title} 圖片轉換失敗，未附入）`) }));
      }
    }
  }
  if (chartNote) kids.push(new Paragraph({ children: inlineRuns(chartNote, { italics: true, size: 18 }) }));

  kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns(`${charts.length ? '六' : '五'}、AI 分析報告`) }));
  if (report) {
    const meta = [
      ['項目', '內容'],
      ['報告類型', report.isDemo ? '示範內容（程式範本，非即時 AI 結果）' : `Groq AI 即時分析：${report.analysisLabel || ''}`],
      ['實際使用模型', report.isDemo ? '未使用（示範）' : report.model || '未提供'],
      ['是否使用備援模型', report.isDemo ? '—' : report.usedFallback ? '是' : '否'],
      ['Token 用量（API 回傳）', report.isDemo ? '—（示範不顯示）' : report.usage?.total !== null && report.usage?.total !== undefined ? `輸入 ${report.usage.prompt ?? '未提供'}／輸出 ${report.usage.completion ?? '未提供'}／合計 ${report.usage.total}` : '未提供'],
      ['API 推論時間', report.isDemo ? '—' : report.usage?.apiTotalTime !== null && report.usage?.apiTotalTime !== undefined ? `${Number(report.usage.apiTotalTime).toFixed(2)} 秒` : '未提供'],
      ['前端實測總請求時間', report.isDemo ? '—' : report.clientTotalMs !== undefined ? `${(report.clientTotalMs / 1000).toFixed(2)} 秒` : '未提供'],
    ];
    if (report.truncated) meta.push(['注意', '模型輸出因長度上限被截斷，內容可能不完整']);
    kids.push(makeTable(meta));
    kids.push(new Paragraph({ text: '' }));
    kids.push(...markdownToBlocks(report.content));
  } else kids.push(new Paragraph({ children: inlineRuns('本次匯出未包含 AI 分析。') }));

  kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns('投資風險聲明') }));
  kids.push(new Paragraph({ children: inlineRuns(RISK_DISCLAIMER, { bold: true }) }));

  return new Document({
    creator: '台股個股資料分析系統',
    title: `${symbol} 分析報告`,
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [{ properties: {}, children: kids }],
  });
}

export async function reportToBlob(info) {
  return Packer.toBlob(buildReportDocument(info));
}
export async function reportToBuffer(info) {
  return Packer.toBuffer(buildReportDocument(info));
}
