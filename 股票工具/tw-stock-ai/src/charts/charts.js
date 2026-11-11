// 圖表控制（ApexCharts）
// x 軸使用「交易日序號」數值軸：交易日連續無週末空隙、各圖以相同 x 對齊，並以 chart.group 同步縮放與提示。
import ApexCharts from 'apexcharts';

const UP = '#ef4444';
const DOWN = '#22c55e';
const GROUP = 'tw-stock';
const charts = {};
let zoomRange = null;
let fullX = null;

const base = (id, height) => ({
  chart: {
    id,
    group: GROUP,
    height,
    background: 'transparent',
    foreColor: '#9aa6bd',
    fontFamily: 'inherit',
    animations: { enabled: false },
    toolbar: { show: true, tools: { download: false, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: false } },
    zoom: { enabled: true, type: 'x' },
  },
  theme: { mode: 'dark' },
  grid: { borderColor: '#26324a', strokeDashArray: 3 },
  legend: { labels: { colors: '#c9d2e3' }, fontSize: '12px' },
  dataLabels: { enabled: false },
  stroke: { width: 1.5 },
});

const dateAxis = (dates) => ({
  type: 'numeric',
  tickAmount: Math.min(8, Math.max(2, dates.length - 1)),
  labels: {
    formatter: (v) => {
      const i = Math.round(v);
      return dates[i] ? dates[i].slice(2) : '';
    },
    style: { fontSize: '11px' },
  },
  tooltip: { enabled: false },
});

const yAxis = (opts = {}) => ({
  labels: { minWidth: 56, maxWidth: 56, formatter: (v) => (v === null || v === undefined ? '' : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Number(v).toFixed(opts.d ?? 2)) },
  ...opts.extra,
});

const line = (name, arr, s, e) => ({ name, type: 'line', data: arr.slice(s, e + 1).map((y, k) => ({ x: s + k, y: y === null ? null : y })) });

function n(v, d = 2) {
  return v === null || v === undefined || !Number.isFinite(v) ? '—' : Number(v).toFixed(d);
}

function tooltipHtml(i, recs, ind, volumeUnit) {
  const r = recs[i];
  if (!r) return '';
  const prev = recs[i - 1];
  const ch = prev ? r.close / prev.close - 1 : null;
  const dir = ch === null ? '無前一日' : ch > 0 ? `▲ +${(ch * 100).toFixed(2)}%` : ch < 0 ? `▼ ${(ch * 100).toFixed(2)}%` : '— 0.00%';
  const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  // 只輸出數值與固定標籤（皆為程式產生），不含匯入文字
  return `<div class="tt"><b>${r.date}</b> <span>${dir}</span><table>${row('開', n(r.open))}${row('高', n(r.high))}${row('低', n(r.low))}${row('收', n(r.close))}${row(`量(${volumeUnit})`, Math.round(r.volume).toLocaleString('zh-TW'))}${row('MA5/20/60', `${n(ind.ma5[i])} / ${n(ind.ma20[i])} / ${n(ind.ma60[i])}`)}${row('RSI14', n(ind.rsi14[i]))}${row('K / D', `${n(ind.k[i])} / ${n(ind.d[i])}`)}${row('DIF/訊號/柱', `${n(ind.dif[i], 3)} / ${n(ind.signal[i], 3)} / ${n(ind.hist[i], 3)}`)}${row('布林上/中/下', `${n(ind.bbUpper[i])} / ${n(ind.bbMid[i])} / ${n(ind.bbLower[i])}`)}</table></div>`;
}

function sharedTooltip(recs, ind, volumeUnit) {
  return {
    shared: false,
    intersect: false,
    theme: 'dark',
    custom: ({ seriesIndex, dataPointIndex, w }) => {
      const x = w.globals.seriesX?.[seriesIndex]?.[dataPointIndex];
      return tooltipHtml(Math.round(x ?? -1), recs, ind, volumeUnit);
    },
  };
}

export function destroyCharts() {
  for (const k of Object.keys(charts)) {
    try {
      charts[k].destroy();
    } catch {
      /* 已銷毀 */
    }
    delete charts[k];
  }
  zoomRange = null;
}

export function getZoomRange() {
  return zoomRange;
}

/**
 * @param {object} p { recs, ind, range:[s,e], showBB, volumeUnit, stats, onZoom }
 */
export async function renderCharts({ recs, ind, range, showBB, volumeUnit, stats, onZoom, el }) {
  destroyCharts();
  const [s, e] = range;
  const dates = recs.map((r) => r.date);
  const xa = { ...dateAxis(dates), min: s - 0.5, max: e + 0.5 };
  fullX = [s - 0.5, e + 0.5];
  const tt = sharedTooltip(recs, ind, volumeUnit);
  const zoomed = (ctx, { xaxis }) => {
    if (!xaxis || xaxis.min === undefined) return;
    const a = Math.max(s, Math.ceil(xaxis.min));
    const b = Math.min(e, Math.floor(xaxis.max));
    zoomRange = a <= b ? [dates[a], dates[b]] : null;
    onZoom?.(zoomRange);
  };

  const candle = { name: 'K 線', type: 'candlestick', data: recs.slice(s, e + 1).map((r, k) => ({ x: s + k, y: [r.open, r.high, r.low, r.close] })) };
  const mainSeries = [candle, line('MA5', ind.ma5, s, e), line('MA20', ind.ma20, s, e), line('MA60', ind.ma60, s, e)];
  const colors = ['#f39c12', '#fbbf24', '#4aa3ff', '#c084fc'];
  if (showBB) {
    mainSeries.push(line('布林上軌', ind.bbUpper, s, e), line('布林中軌', ind.bbMid, s, e), line('布林下軌', ind.bbLower, s, e));
    colors.push('#94a3b8', '#64748b', '#94a3b8');
  }
  const mainOpt = {
    ...base('main', 360),
    series: mainSeries,
    colors,
    stroke: { width: mainSeries.map((x) => (x.type === 'candlestick' ? 1 : 1.6)), dashArray: mainSeries.map((x) => (x.name.startsWith('布林') ? 4 : 0)) },
    plotOptions: { candlestick: { colors: { upward: UP, downward: DOWN }, wick: { useFillColor: true } } },
    xaxis: xa,
    yaxis: yAxis({ extra: { tooltip: { enabled: false } } }),
    tooltip: tt,
    chart: { ...base('main', 360).chart, events: { zoomed, scrolled: zoomed } },
    noData: { text: '無資料' },
  };

  const volOpt = {
    ...base('vol', 150),
    series: [{ name: `成交量(${volumeUnit})`, type: 'bar', data: recs.slice(s, e + 1).map((r, k) => ({ x: s + k, y: r.volume })) }],
    colors: [
      ({ dataPointIndex }) => {
        const i = s + dataPointIndex;
        const r = recs[i];
        const pv = recs[i - 1];
        if (!r || !pv) return '#64748b';
        return r.close > pv.close ? UP : r.close < pv.close ? DOWN : '#94a3b8';
      },
    ],
    plotOptions: { bar: { columnWidth: '80%' } },
    fill: { opacity: 0.9 },
    xaxis: { ...xa, labels: { ...xa.labels, show: false } },
    yaxis: yAxis({ d: 0 }),
    tooltip: tt,
    legend: { show: false },
  };

  const macdOpt = {
    ...base('macd', 170),
    series: [
      { name: 'MACD 柱', type: 'bar', data: ind.hist.slice(s, e + 1).map((y, k) => ({ x: s + k, y, fillColor: y === null ? 'transparent' : y >= 0 ? UP : DOWN })) },
      line('DIF', ind.dif, s, e),
      line('訊號線', ind.signal, s, e),
    ],
    colors: ['#94a3b8', '#f39c12', '#4aa3ff'],
    stroke: { width: [0, 1.6, 1.6] },
    plotOptions: { bar: { columnWidth: '70%' } },
    xaxis: { ...xa, labels: { ...xa.labels, show: false } },
    yaxis: yAxis({ d: 2 }),
    tooltip: tt,
  };

  const kdOpt = {
    ...base('kd', 160),
    series: [line('K', ind.k, s, e), line('D', ind.d, s, e)],
    colors: ['#f39c12', '#4aa3ff'],
    xaxis: xa,
    yaxis: yAxis({ d: 0, extra: { min: 0, max: 100, tickAmount: 4 } }),
    annotations: { yaxis: [{ y: 80, borderColor: '#ef4444', strokeDashArray: 4 }, { y: 20, borderColor: '#22c55e', strokeDashArray: 4 }] },
    tooltip: tt,
  };

  const { up, down, flat } = stats.upDownFlat;
  const pieOpt = {
    chart: { type: 'donut', height: 240, background: 'transparent', foreColor: '#9aa6bd', fontFamily: 'inherit', animations: { enabled: false } },
    theme: { mode: 'dark' },
    series: [up, down, flat],
    labels: ['上漲（▲）', '下跌（▼）', '平盤（—）'],
    colors: [UP, DOWN, '#94a3b8'],
    legend: { position: 'bottom', labels: { colors: '#c9d2e3' } },
    dataLabels: { formatter: (v) => `${v.toFixed(1)}%` },
    stroke: { colors: ['#141c2b'] },
    noData: { text: '無可判斷交易日' },
  };

  charts.main = new ApexCharts(el.main, mainOpt);
  charts.vol = new ApexCharts(el.vol, volOpt);
  charts.macd = new ApexCharts(el.macd, macdOpt);
  charts.kd = new ApexCharts(el.kd, kdOpt);
  charts.pie = new ApexCharts(el.pie, up + down + flat ? pieOpt : { ...pieOpt, series: [] });
  await Promise.all(Object.values(charts).map((c) => c.render()));
}

export function resetZoom() {
  for (const k of ['main', 'vol', 'macd', 'kd']) {
    try {
      if (charts[k] && fullX) charts[k].zoomX(fullX[0], fullX[1]);
    } catch {
      /* ignore */
    }
  }
  zoomRange = null;
}

/** 匯出圖表 PNG（ApexCharts dataURI），失敗則略過並回報 */
export async function exportChartImages() {
  const list = [
    ['main', 'K 線與均線'],
    ['vol', '成交量'],
    ['macd', 'MACD'],
    ['kd', 'KD'],
    ['pie', '漲跌平盤佔比'],
  ];
  const out = [];
  const failed = [];
  for (const [k, title] of list) {
    const c = charts[k];
    if (!c) continue;
    try {
      const { imgURI } = await c.dataURI({ scale: 1.5 });
      if (!imgURI?.startsWith('data:image/png')) throw new Error('非 PNG');
      const dims = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res({ width: im.naturalWidth, height: im.naturalHeight });
        im.onerror = rej;
        im.src = imgURI;
      });
      out.push({ title, dataUrl: imgURI, ...dims });
    } catch {
      failed.push(title);
    }
  }
  return { images: out, failed };
}
