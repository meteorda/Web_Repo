// UI 狀態管理與流程串接
import './styles.css';
import { LIMITS, ADJUSTMENT_LABELS, RISK_DISCLAIMER } from './config.js';
import { $, $$, h, clear, toast, setStatus, fmt, fileSafe } from './ui/dom.js';
import { buildDemoDataset } from './data/demo.js';
import { listSymbols, recordsForSymbol, rangeIndices } from './data/model.js';
import { computeIndicators, insufficiencyNotes, INDICATOR_NOTES } from './indicators/indicators.js';
import { computeStats, TRADING_DAYS_PER_YEAR } from './indicators/stats.js';
import { detectPatterns, PATTERN_DISCLAIMER, PATTERN_RULES } from './analysis/patterns.js';
import { computeLevels } from './analysis/levels.js';
import { renderCharts, destroyCharts, resetZoom, getZoomRange, exportChartImages } from './charts/charts.js';
import { createTable } from './ui/table.js';
import { setupImportDialog } from './ui/importDialog.js';
import { ANALYSIS_TYPES } from './ai/prompts.js';
import { buildMessages } from './ai/payload.js';
import { analyze, fetchModels, getServerInfo } from './ai/client.js';
import { renderMarkdownSafe, buildDemoReport } from './report/render.js';
import { toCsv, quoteColumns, errorsToCsv, downloadText, downloadBlob } from './export/csv.js';
import { saveState, loadState, clearAll } from './storage/local.js';

// ───────── 狀態 ─────────
const state = {
  datasets: [],
  activeId: null,
  symbol: null,
  start: null,
  end: null,
  apiKey: '', // 僅存在記憶體
  models: [],
  server: { ok: false },
  calc: null,
  report: null,
  aiCtrl: null,
  busy: false,
  prefs: { primary: '', fallback: '', allowFallback: false, maxTokens: 2048, showBB: false, tableGroups: ['ma'], analysisType: 'trend', activeIsDemo: false },
};

const table = createTable({ tableEl: $('#dataTable'), pagerEl: $('#tblPager') });
const importer = setupImportDialog({ onImported });

const activeDataset = () => state.datasets.find((d) => d.id === state.activeId) || null;

function persist() {
  const ds = activeDataset();
  const res = saveState({
    datasets: state.datasets,
    prefs: { ...state.prefs, activeId: ds && !ds.isDemo ? ds.id : null, activeIsDemo: Boolean(ds?.isDemo), symbol: state.symbol, start: state.start, end: state.end },
  });
  if (!res.ok) toast(res.error, 'warn', 7000);
}

// ───────── 計算 ─────────
function compute() {
  const ds = activeDataset();
  if (!ds || !state.symbol) return null;
  const recs = recordsForSymbol(ds, state.symbol);
  if (!recs.length) return null;
  const range = rangeIndices(recs, state.start, state.end);
  if (!range) return { ds, recs, range: null };
  const ind = computeIndicators(recs);
  const stats = computeStats(recs, range);
  const patterns = detectPatterns(recs, range);
  const levels = computeLevels(recs, range[1]);
  const e = range[1];
  const latest = Object.fromEntries(Object.entries(ind).map(([k, v]) => [k, v[e]]));
  return { ds, recs, range, ind, stats, patterns, levels, latest, insufficient: insufficiencyNotes(e + 1) };
}

// ───────── 渲染 ─────────
function renderSelectors() {
  const selD = $('#selDataset');
  const selS = $('#selSymbol');
  clear(selD);
  clear(selS);
  if (!state.datasets.length) {
    selD.append(h('option', {}, '（無）'));
    selS.append(h('option', {}, '（無）'));
    selD.disabled = selS.disabled = true;
    return;
  }
  for (const d of state.datasets) selD.append(h('option', { value: d.id, selected: d.id === state.activeId }, `${d.isDemo ? '【示範】' : '【匯入】'}${d.label}`));
  const syms = listSymbols(activeDataset());
  for (const s of syms) selS.append(h('option', { value: s.symbol, selected: s.symbol === state.symbol }, `${s.symbol} ${s.name}（${s.count} 筆）`));
  selD.disabled = false;
  selS.disabled = syms.length === 0;
}

function renderHeader(c) {
  const ds = c?.ds;
  $('#hdrStock').textContent = ds && state.symbol ? `${state.symbol} ${c.recs[c.recs.length - 1]?.name || ''}` : '尚未載入資料';
  $('#hdrSource').textContent = ds && c.stats ? `來源：${ds.isDemo ? '合成示範' : ds.source}｜資料日期 ${c.stats.startDate} ～ ${c.stats.endDate}` : '';
  $('#hdrDemo').hidden = !ds?.isDemo;
  const adj = $('#hdrAdjust');
  adj.hidden = !ds;
  if (ds) adj.textContent = ADJUSTMENT_LABELS[ds.adjustmentStatus];
  $('#footSource').textContent = ds ? `目前資料集：${ds.source}；成交量單位：${ds.volumeUnit}；${ADJUSTMENT_LABELS[ds.adjustmentStatus]}。` : '尚未載入資料。';
}

function card(k, v, s, cls = '') {
  return h('div', { class: 'card' }, h('div', { class: 'k' }, k), h('div', { class: `v ${cls}` }, v), s ? h('div', { class: 's' }, s) : null);
}

function renderCards(c) {
  const box = clear($('#cards'));
  const s = c.stats;
  const unit = c.ds.volumeUnit;
  const day = fmt.dirText(s.dayChange);
  const per = fmt.dirText(s.periodReturn);
  box.append(
    card('最新收盤', fmt.num(s.lastClose), s.endDate),
    card('單日漲跌（幅）', s.dayChange === null ? '無法計算' : `${s.dayChange > 0 ? '+' : ''}${fmt.num(s.dayChange)}（${fmt.pct(s.dayChangePct)}）`, s.prevDate ? `${day.text}｜相較前一交易日 ${s.prevDate}` : '缺少前一交易日收盤', day.cls),
    card('區間漲跌幅', fmt.pct(s.periodReturn), `${per.text}｜區間末筆 ÷ 首筆 − 1`, per.cls),
    card('區間最高', fmt.num(s.periodHigh), s.periodHighDate),
    card('區間最低', fmt.num(s.periodLow), s.periodLowDate),
    card('平均成交量', fmt.int(s.avgVolume), `單位：${unit}`),
    card('資料筆數', `${s.count} 筆`, `${s.startDate} ～ ${s.endDate}`),
    card('日報酬標準差', fmt.pctAbs(s.dailyReturnStd), `年化 ${fmt.pctAbs(s.annualizedVol)}（×√${TRADING_DAYS_PER_YEAR}）`),
    card('平均日內振幅', fmt.pctAbs(s.avgIntradayAmplitude), '(高−低)/前日收，非報酬波動率'),
    card('最大單日漲／跌', s.maxGain ? `${fmt.pct(s.maxGain.value)}／${fmt.pct(s.maxLoss.value)}` : '無法計算', s.maxGain ? `${s.maxGain.date}／${s.maxLoss.date}` : '區間僅 1 筆'),
    card('最大回撤', fmt.pct(s.maxDrawdown?.value), s.maxDrawdown && s.maxDrawdown.value < 0 ? `${s.maxDrawdown.peakDate} → ${s.maxDrawdown.troughDate}` : '區間內無回撤', s.maxDrawdown?.value < 0 ? 'down' : ''),
    card('最大連續下跌', `${s.maxConsecutiveDown} 天`, '收盤連續低於前一日'),
  );
  const ins = $('#insufficient');
  ins.hidden = !c.insufficient.length;
  ins.textContent = c.insufficient.length ? `歷史資料不足：${c.insufficient.join(' ')}` : '';
}

function renderQuality(c) {
  const ds = c.ds;
  const box = clear($('#quality'));
  const sm = ds.importSummary;
  box.append(
    h(
      'div',
      { class: 'stat-row' },
      h('span', {}, ds.isDemo ? '類型：合成示範資料（非真實行情）' : '類型：使用者匯入資料'),
      h('span', {}, `來源：${ds.source}`),
      h('span', {}, `匯入時間：${new Date(ds.importedAt).toLocaleString('zh-TW', { hour12: false })}`),
      h('span', {}, `幣別：${ds.currency}`),
      h('span', {}, `成交量單位：${ds.volumeUnit}`),
      h('span', {}, ADJUSTMENT_LABELS[ds.adjustmentStatus]),
    ),
  );
  if (sm) {
    box.append(
      h(
        'div',
        { class: 'stat-row' },
        h('span', {}, `原始列數 ${sm.raw}`),
        h('span', {}, `有效 ${sm.valid}`),
        h('span', {}, `缺值 ${sm.missing}`),
        h('span', {}, `異常 ${sm.anomaly}`),
        h('span', {}, `日期歧義 ${sm.ambiguous}`),
        h('span', {}, `重複組 ${sm.duplicateGroups}（移除 ${sm.duplicateRemoved}）`),
        h('span', {}, `日期範圍 ${sm.dateRange ? sm.dateRange.join(' ～ ') : '—'}`),
      ),
    );
    if (sm.errorsSample?.length) box.append(h('button', { class: 'btn btn-sm', onclick: () => downloadText(errorsToCsv(sm.errorsSample, sm.headers), `錯誤資料_${fileSafe(ds.label)}.csv`) }, `下載錯誤資料清單（${sm.errorCount} 列${sm.errorCount > 200 ? '，保存前 200 列' : ''}）`));
  }
  box.append(h('h3', {}, '清洗規則與確認紀錄'), h('ul', { class: 'notes' }, ds.cleaningLog.map((l) => h('li', {}, l))));
  if (ds.adjustmentStatus !== 'adjusted') box.append(h('p', { class: 'warn' }, '價格未確認已還原權息：除權息、股票分割可能造成價格跳空，影響報酬率、最大回撤與技術指標。'));
}

function renderLevels(c) {
  const box = clear($('#levels'));
  const lv = c.levels;
  box.append(h('p', { class: 'hint' }, lv.method));
  if (lv.insufficient) {
    box.append(h('p', { class: 'warn' }, lv.insufficient));
    return;
  }
  const rows = [
    ...lv.resistances.slice().reverse().map((z) => ['壓力', z]),
    ...lv.supports.map((z) => ['支撐', z]),
  ];
  box.append(
    h(
      'table',
      { class: 'mini' },
      h('thead', {}, h('tr', {}, ['類型', '參考區', '觸及', '轉折日期'].map((x) => h('th', {}, x)))),
      h(
        'tbody',
        {},
        rows.length ? rows.map(([t, z]) => h('tr', {}, h('td', { class: t === '壓力' ? 'up' : 'down' }, t === '壓力' ? '▲ 壓力' : '▼ 支撐'), h('td', {}, `${fmt.num(z.low)} ～ ${fmt.num(z.high)}`), h('td', {}, `${z.touches} 次`), h('td', {}, z.dates.slice(-3).join('、')))) : h('tr', {}, h('td', { colspan: 4 }, '回看期間內無轉折點聚類')),
      ),
    ),
    h('p', { class: 'hint' }, `最新收盤 ${fmt.num(lv.lastClose)}；回看期間最高 ${fmt.num(lv.rangeHigh)}、最低 ${fmt.num(lv.rangeLow)}；轉折點 ${lv.pivotCount} 個。`),
  );
}

function renderPatterns(c) {
  const box = clear($('#patterns'));
  box.append(h('p', { class: 'hint' }, PATTERN_DISCLAIMER));
  box.append(h('details', {}, h('summary', {}, '判定條件'), h('ul', { class: 'notes' }, Object.values(PATTERN_RULES).map((r) => h('li', {}, `${r.name}：${r.rule}`)))));
  const list = c.patterns.slice().reverse();
  box.append(
    h(
      'table',
      { class: 'mini' },
      h('thead', {}, h('tr', {}, ['日期', '型態', '前段', '開／高／低／收'].map((x) => h('th', {}, x)))),
      h('tbody', {}, list.length ? list.map((p) => h('tr', {}, h('td', {}, p.date), h('td', {}, p.name), h('td', {}, p.context), h('td', {}, `${fmt.num(p.prices.open)}／${fmt.num(p.prices.high)}／${fmt.num(p.prices.low)}／${fmt.num(p.prices.close)}`))) : h('tr', {}, h('td', { colspan: 4 }, '區間內未偵測到設定的型態'))),
    ),
  );
}

function renderTable(c) {
  const [s, e] = c.range;
  const rows = [];
  for (let i = s; i <= e; i++) {
    const r = c.recs[i];
    const row = { ...r, chg: i > 0 ? r.close - c.recs[i - 1].close : null };
    for (const k of Object.keys(c.ind)) row[k] = c.ind[k][i];
    rows.push(row);
  }
  $('#tblFrom').value = '';
  $('#tblTo').value = '';
  $('#tblFrom').min = $('#tblTo').min = c.stats.startDate;
  $('#tblFrom').max = $('#tblTo').max = c.stats.endDate;
  table.setFilter('', '');
  table.setData(rows, c.ds.volumeUnit);
}

function renderCalcNotes(c) {
  const ul = clear($('#calcNotes'));
  for (const n of INDICATOR_NOTES) ul.append(h('li', {}, n));
  ul.append(h('li', {}, `指標暖機使用區間前 ${c.range[0]} 筆歷史資料；區間統計僅用 ${c.stats.count} 筆區間資料。`));
  const { up, down, flat } = c.stats.upDownFlat;
  $('#pieNote').textContent = `依當日收盤相較前一交易日收盤判斷：上漲 ${up}、下跌 ${down}、平盤 ${flat} 日；區間首日（${c.stats.startDate}）因前一交易日不在區間內，排除不計。`;
}

async function renderAll({ charts = true } = {}) {
  renderSelectors();
  const c = compute();
  state.calc = c;
  const has = Boolean(c?.range);
  $('#emptyState').hidden = Boolean(c);
  $('#content').hidden = !c;
  for (const id of ['#dateStart', '#dateEnd', '#btnApplyRange', '#btnFullRange']) $(id).disabled = !c;
  $('#btnClearCurrent').disabled = !activeDataset();
  renderHeader(c);
  if (!c) {
    destroyCharts();
    return;
  }
  const first = c.recs[0].date;
  const last = c.recs[c.recs.length - 1].date;
  for (const id of ['#dateStart', '#dateEnd']) {
    $(id).min = first;
    $(id).max = last;
  }
  $('#dateStart').value = state.start || first;
  $('#dateEnd').value = state.end || last;
  if (!has) {
    $('#rangeNote').textContent = '所選區間內沒有交易資料，請調整日期。';
    clear($('#cards')).append(h('div', { class: 'warn' }, '所選區間沒有資料'));
    destroyCharts();
    return;
  }
  $('#rangeNote').textContent = `全部資料 ${first} ～ ${last}（${c.recs.length} 筆）；分析區間 ${c.stats.count} 筆。`;
  renderCards(c);
  renderQuality(c);
  renderLevels(c);
  renderPatterns(c);
  renderTable(c);
  renderCalcNotes(c);
  if (charts) {
    try {
      await renderCharts({
        recs: c.recs,
        ind: c.ind,
        range: c.range,
        showBB: state.prefs.showBB,
        volumeUnit: c.ds.volumeUnit,
        stats: c.stats,
        el: { main: $('#chartMain'), vol: $('#chartVol'), macd: $('#chartMacd'), kd: $('#chartKd'), pie: $('#chartPie') },
        onZoom: (z) => {
          $('#btnZoomApply').disabled = !z;
        },
      });
    } catch (e) {
      toast(`圖表繪製失敗：${e.message}`, 'err');
    }
  }
  $('#btnZoomApply').disabled = true;
  updateAiButtons();
}

// ───────── 資料集操作 ─────────
function setActive(id, { keepRange = false } = {}) {
  state.activeId = id;
  const syms = listSymbols(activeDataset());
  if (!syms.some((s) => s.symbol === state.symbol)) state.symbol = syms[0]?.symbol || null;
  if (!keepRange) {
    state.start = null;
    state.end = null;
  }
  clearReport();
}

function onImported(ds) {
  state.datasets.push(ds);
  setActive(ds.id);
  persist();
  renderAll();
  toast(`已匯入 ${ds.records.length} 筆有效資料（${listSymbols(ds).map((s) => s.symbol).join('、')}）`, 'ok');
}

function loadDemo() {
  let ds = state.datasets.find((d) => d.isDemo);
  if (!ds) {
    ds = buildDemoDataset();
    state.datasets.unshift(ds);
  }
  setActive(ds.id);
  persist();
  renderAll();
  toast('已載入合成示範資料（非真實市場行情）', 'ok');
  closeSidebarMobile();
}

function applyRange(start, end) {
  if (start && end && start > end) {
    toast('起始日期不可晚於結束日期', 'err');
    return;
  }
  state.start = start || null;
  state.end = end || null;
  clearReport();
  persist();
  renderAll();
}

// ───────── AI ─────────
function updateAiButtons() {
  const ready = Boolean(state.calc?.range);
  const canCall = ready && (state.apiKey || (state.server.serverKeyConfigured && state.server.ok)) && $('#selPrimary').value;
  $('#btnAnalyze').disabled = state.busy || !canCall;
  $('#btnPreview').disabled = !ready;
  $('#btnDemoReport').disabled = state.busy || !ready;
  $('#btnCancel').disabled = !state.busy;
  $('#btnDocx').disabled = state.busy || !ready;
  $('#btnAnalyze').title = canCall ? '' : '需要已載入資料、API Key（或伺服器金鑰）與主要模型';
}

function clearReport() {
  state.report = null;
  clear($('#aiReport'));
  $('#aiMeta').hidden = true;
  $('#btnRetry').hidden = true;
  setStatus($('#aiStatus'), '');
}

function aiContext() {
  const c = state.calc;
  return { dataset: c.ds, symbol: state.symbol, records: c.recs, range: c.range, ind: c.ind, stats: c.stats, patterns: c.patterns, levels: c.levels };
}

function currentType() {
  return $('input[name="aiType"]:checked')?.value || 'trend';
}

function renderReport() {
  const r = state.report;
  const meta = clear($('#aiMeta'));
  if (!r) return;
  clear($('#aiReport')).insertAdjacentHTML('afterbegin', renderMarkdownSafe(r.content));
  meta.hidden = false;
  if (r.isDemo) {
    meta.append(h('span', { class: 'tag tag-demo' }, '示範內容，非即時 AI 結果'), h('span', {}, '模型：未使用'), h('span', {}, 'Token：—（示範不顯示）'));
  } else {
    const u = r.usage || {};
    meta.append(
      h('span', { class: 'tag tag-ai' }, 'Groq AI 即時分析'),
      h('span', {}, `類型：${r.analysisLabel}`),
      h('span', {}, `實際回傳模型：${r.model || '未提供'}`),
      r.usedFallback ? h('span', { class: 'tag tag-demo' }, `已改用備援模型（主要模型錯誤：${r.primaryError}）`) : null,
      h('span', {}, `Token（API 回傳）：${u.total !== null && u.total !== undefined ? `輸入 ${u.prompt ?? '未提供'}／輸出 ${u.completion ?? '未提供'}／合計 ${u.total}` : '未提供'}`),
      h('span', {}, `API 推論時間：${u.apiTotalTime !== null && u.apiTotalTime !== undefined ? `${Number(u.apiTotalTime).toFixed(2)} 秒` : '未提供'}`),
      h('span', {}, `前端實測總時間：${(r.clientTotalMs / 1000).toFixed(2)} 秒`),
      r.truncated ? h('span', { class: 'tag tag-demo' }, '⚠ 輸出因長度上限被截斷，可提高輸出長度上限後重試') : null,
    );
  }
}

const KIND_HINT = {
  auth: '請確認 API Key 是否正確、未過期，且有權限使用此模型。此錯誤不會自動重試。',
  rate_limit: '已達速率或用量限制。已依 Retry-After 或退避策略重試；可稍後手動重試。降低輸入量不一定能解決。',
  not_found: '模型可能已下架或名稱錯誤，請重新測試連線並選擇其他模型。',
  too_large: '請求資料過大，可縮短自訂問題或縮短分析區間後重試。',
  bad_request: '請求格式或參數不被此模型支援（例如輸出長度參數或非對話模型）。',
  timeout: '請求逾時，可稍後重試。',
  network: '無法連線至本機代理伺服器，請確認已執行 npm run dev 或 npm start。',
  server: 'Groq 服務端錯誤，已有限次重試，可稍後手動重試。',
  empty: '模型回傳空內容，可手動重試或改用其他模型。',
  bad_response: '回應格式異常，可手動重試。',
  cancelled: '已取消，不會再自動重試或切換模型。',
};

async function runAnalysis() {
  if (state.busy || !state.calc?.range) return;
  const type = currentType();
  let built;
  try {
    built = buildMessages(aiContext(), type, $('#customQ').value);
  } catch (e) {
    setStatus($('#aiStatus'), e.message, 'err');
    return;
  }
  if (type === 'custom' && !$('#customQ').value.trim()) {
    setStatus($('#aiStatus'), '請輸入自訂問題', 'err');
    $('#customQ').focus();
    return;
  }
  state.busy = true;
  state.aiCtrl = new AbortController();
  $('#btnRetry').hidden = true;
  updateAiButtons();
  setStatus($('#aiStatus'), '準備送出…', 'busy');
  const snapshot = { symbol: state.symbol, start: state.calc.stats.startDate, end: state.calc.stats.endDate };
  try {
    const res = await analyze({
      apiKey: state.apiKey,
      primary: $('#selPrimary').value,
      fallback: $('#selFallback').value,
      allowFallback: $('#chkFallback').checked,
      messages: built.messages,
      maxTokens: Number($('#maxTokens').value) || undefined,
      signal: state.aiCtrl.signal,
      onStatus: (t) => setStatus($('#aiStatus'), t, 'busy'),
    });
    if (snapshot.symbol !== state.symbol) return; // 期間切換股票則丟棄
    state.report = {
      ...res,
      isDemo: false,
      analysisLabel: ANALYSIS_TYPES[type].label,
      generatedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
      model: res.model || res.requestedModel,
      ...snapshot,
    };
    renderReport();
    setStatus($('#aiStatus'), `分析完成（${snapshot.symbol}，${snapshot.start} ～ ${snapshot.end}）`, 'ok');
  } catch (e) {
    const hint = KIND_HINT[e.kind] || '';
    setStatus($('#aiStatus'), `${e.message}${e.detail ? `：${e.detail}` : ''}。${hint}`, e.kind === 'cancelled' ? '' : 'err');
    $('#btnRetry').hidden = false;
  } finally {
    state.busy = false;
    state.aiCtrl = null;
    updateAiButtons();
  }
}

function showPayload() {
  if (!state.calc?.range) return;
  try {
    const built = buildMessages(aiContext(), currentType(), $('#customQ').value);
    $('#payloadInfo').textContent = `共約 ${built.chars.toLocaleString()} 字元（字元數不等於 Token 數，實際用量以 API 回傳為準；上限 ${LIMITS.AI_MAX_INPUT_CHARS.toLocaleString()} 字元）。僅包含 ${state.symbol} 於 ${state.calc.stats.endDate}（含）以前的摘要、最新指標與近期 ${built.recentN} 筆行情；不含 PDF 原文與其他股票。`;
    $('#payloadPre').textContent = built.messages.map((m) => `【${m.role}】\n${m.content}`).join('\n\n');
  } catch (e) {
    $('#payloadInfo').textContent = e.message;
    $('#payloadPre').textContent = '';
  }
  $('#dlgPayload').showModal();
}

async function testConnection() {
  const key = $('#apiKey').value.trim();
  state.apiKey = key;
  if (!key && !state.server.serverKeyConfigured) {
    setStatus($('#connStatus'), '請輸入 API Key（伺服器未設定金鑰）', 'err');
    return;
  }
  const btn = $('#btnTest');
  btn.disabled = true;
  setStatus($('#connStatus'), '連線中…', 'busy');
  try {
    const models = await fetchModels(key);
    state.models = models;
    fillModelSelects();
    const usable = models.filter((m) => m.active && !m.likelyNonChat).length;
    setStatus($('#connStatus'), `連線成功：取得 ${models.length} 個模型（其中 ${usable} 個可能適用對話）。實際可用性以呼叫結果為準。`, 'ok');
  } catch (e) {
    setStatus($('#connStatus'), `${e.message}${e.detail ? `：${e.detail}` : ''}`, 'err');
    state.models = [];
    fillModelSelects();
  } finally {
    btn.disabled = false;
    updateAiButtons();
  }
}

function fillModelSelects() {
  const p = $('#selPrimary');
  const f = $('#selFallback');
  clear(p);
  clear(f);
  if (!state.models.length) {
    p.append(h('option', { value: '' }, '（請先測試連線）'));
    f.append(h('option', { value: '' }, '（不使用）'));
    p.disabled = f.disabled = true;
    return;
  }
  const mk = (m, sel) => h('option', { value: m.id, selected: m.id === sel, disabled: !m.active }, `${m.id}${m.likelyNonChat ? '（可能非對話模型）' : ''}${m.contextWindow ? `｜ctx ${m.contextWindow}` : ''}${m.active ? '' : '｜停用'}`);
  const chatFirst = state.models.filter((m) => m.active && !m.likelyNonChat);
  const primary = state.models.some((m) => m.id === state.prefs.primary) ? state.prefs.primary : chatFirst[0]?.id || '';
  for (const m of state.models) p.append(mk(m, primary));
  f.append(h('option', { value: '' }, '（不使用）'));
  for (const m of state.models) f.append(mk(m, state.prefs.fallback));
  p.disabled = f.disabled = false;
  state.prefs.primary = p.value;
}

// ───────── 匯出 ─────────
function exportTableCsv() {
  const c = state.calc;
  if (!c?.range) return;
  const rows = table.filteredRows();
  if (!rows.length) return toast('篩選範圍內無資料', 'warn');
  downloadText(toCsv(rows, table.exportColumns()), `${fileSafe(state.symbol)}_${rows[0].date}_${rows[rows.length - 1].date}${c.ds.isDemo ? '_示範' : ''}.csv`);
  toast(`已匯出 ${rows.length} 筆（UTF-8 含 BOM，可直接以 Excel 開啟）`, 'ok');
}

function exportAllCsv() {
  const ds = activeDataset();
  if (!ds) return;
  downloadText(toCsv(ds.records, quoteColumns(ds.volumeUnit)), `清洗後資料_${fileSafe(ds.label)}${ds.isDemo ? '_示範' : ''}.csv`);
  toast(`已匯出清洗後全部 ${ds.records.length} 筆`, 'ok');
}

async function exportDocx() {
  const c = state.calc;
  if (!c?.range) return;
  const btn = $('#btnDocx');
  btn.disabled = true;
  setStatus($('#aiStatus'), '產生 Word 報告中…', 'busy');
  try {
    let charts = [];
    let chartNote = '';
    if ($('#chkDocxCharts').checked) {
      const r = await exportChartImages();
      charts = r.images;
      if (r.failed.length) chartNote = `下列圖表無法可靠轉為圖片，未附入：${r.failed.join('、')}。`;
    } else chartNote = '本報告未附入圖表圖片（使用者未勾選）。';
    const reportMatches = state.report && state.report.symbol === state.symbol;
    const { reportToBlob } = await import('./export/docx.js');
    const blob = await reportToBlob({
      symbol: state.symbol,
      name: c.recs[c.range[1]].name,
      dataset: c.ds,
      stats: c.stats,
      latest: c.latest,
      patterns: c.patterns,
      levels: c.levels,
      report: reportMatches ? state.report : null,
      charts,
      chartNote,
    });
    downloadBlob(blob, `${fileSafe(state.symbol)}_分析報告_${c.stats.endDate}${state.report?.isDemo || c.ds.isDemo ? '_示範' : ''}.docx`);
    setStatus($('#aiStatus'), `Word 報告已產生${reportMatches ? '' : '（未包含 AI 分析）'}`, 'ok');
  } catch (e) {
    setStatus($('#aiStatus'), `Word 匯出失敗：${e.message}`, 'err');
  } finally {
    updateAiButtons();
  }
}

// ───────── 側欄（手機） ─────────
function closeSidebarMobile() {
  $('#sidebar').classList.remove('open');
  $('#btnMenu').setAttribute('aria-expanded', 'false');
}

// ───────── 事件 ─────────
function bind() {
  $('#footRisk').textContent = RISK_DISCLAIMER;
  $('#btnMenu').addEventListener('click', () => {
    const open = $('#sidebar').classList.toggle('open');
    $('#btnMenu').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#sidebar').classList.contains('open')) closeSidebarMobile();
  });
  $('#btnDemo').addEventListener('click', loadDemo);
  $('#btnDemo2').addEventListener('click', loadDemo);

  const dz = $('#dropzone');
  const fi = $('#fileInput');
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fi.click();
    }
  });
  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('is-over');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('is-over'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('is-over');
    const f = e.dataTransfer?.files?.[0];
    if (f) importer.open(f);
  });
  fi.addEventListener('change', () => {
    const f = fi.files?.[0];
    if (f) importer.open(f);
    fi.value = '';
  });

  $('#selDataset').addEventListener('change', (e) => {
    setActive(e.target.value);
    persist();
    renderAll();
  });
  $('#selSymbol').addEventListener('change', (e) => {
    state.symbol = e.target.value;
    state.start = state.end = null;
    clearReport();
    persist();
    renderAll();
  });
  $('#btnApplyRange').addEventListener('click', () => applyRange($('#dateStart').value, $('#dateEnd').value));
  $('#btnFullRange').addEventListener('click', () => applyRange(null, null));
  for (const id of ['#dateStart', '#dateEnd']) $(id).addEventListener('keydown', (e) => e.key === 'Enter' && $('#btnApplyRange').click());

  $('#chkBB').addEventListener('change', (e) => {
    state.prefs.showBB = e.target.checked;
    persist();
    renderAll();
  });
  $('#btnZoomApply').addEventListener('click', () => {
    const z = getZoomRange();
    if (z) applyRange(z[0], z[1]);
  });
  $('#btnZoomReset').addEventListener('click', () => {
    resetZoom();
    $('#btnZoomApply').disabled = true;
  });

  $$('.col-toggle input').forEach((cb) => {
    cb.checked = state.prefs.tableGroups.includes(cb.dataset.col);
    cb.addEventListener('change', () => {
      state.prefs.tableGroups = $$('.col-toggle input:checked').map((x) => x.dataset.col);
      table.setGroups(state.prefs.tableGroups);
      persist();
    });
  });
  table.setGroups(state.prefs.tableGroups);
  const tf = () => table.setFilter($('#tblFrom').value, $('#tblTo').value);
  $('#tblFrom').addEventListener('change', tf);
  $('#tblTo').addEventListener('change', tf);
  $('#tblSize').addEventListener('change', (e) => table.setSize(Number(e.target.value)));
  $('#btnExportTable').addEventListener('click', exportTableCsv);
  $('#btnExportAll').addEventListener('click', exportAllCsv);

  // AI 類型
  const types = $('#aiTypes');
  for (const [k, t] of Object.entries(ANALYSIS_TYPES)) {
    types.append(h('label', { class: 'chk' }, h('input', { type: 'radio', name: 'aiType', value: k, checked: k === state.prefs.analysisType }), t.label));
  }
  types.addEventListener('change', () => {
    state.prefs.analysisType = currentType();
    $('#customWrap').hidden = state.prefs.analysisType !== 'custom';
    persist();
  });
  $('#customWrap').hidden = state.prefs.analysisType !== 'custom';

  $('#apiKey').addEventListener('input', (e) => {
    state.apiKey = e.target.value.trim();
    updateAiButtons();
  });
  $('#apiKey').addEventListener('keydown', (e) => e.key === 'Enter' && testConnection());
  $('#btnTest').addEventListener('click', testConnection);
  $('#selPrimary').addEventListener('change', (e) => {
    state.prefs.primary = e.target.value;
    persist();
    updateAiButtons();
  });
  $('#selFallback').addEventListener('change', (e) => {
    state.prefs.fallback = e.target.value;
    persist();
  });
  $('#chkFallback').checked = state.prefs.allowFallback;
  $('#chkFallback').addEventListener('change', (e) => {
    state.prefs.allowFallback = e.target.checked;
    persist();
  });
  $('#maxTokens').value = state.prefs.maxTokens;
  $('#maxTokens').addEventListener('change', (e) => {
    const v = Math.min(8192, Math.max(256, Number(e.target.value) || 2048));
    e.target.value = v;
    state.prefs.maxTokens = v;
    persist();
  });

  $('#btnPreview').addEventListener('click', showPayload);
  $('#btnAnalyze').addEventListener('click', runAnalysis);
  $('#btnRetry').addEventListener('click', runAnalysis);
  $('#btnCancel').addEventListener('click', () => {
    state.aiCtrl?.abort();
    setStatus($('#aiStatus'), '取消中…', 'busy');
  });
  $('#btnDemoReport').addEventListener('click', () => {
    const c = state.calc;
    if (!c?.range) return;
    state.report = {
      isDemo: true,
      content: buildDemoReport({ symbol: state.symbol, name: c.recs[c.range[1]].name, stats: c.stats, latest: c.latest, levels: c.levels, dataset: c.ds }),
      generatedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
      symbol: state.symbol,
    };
    renderReport();
    setStatus($('#aiStatus'), '已產生示範報告（程式範本，非即時 AI 結果）', 'ok');
    updateAiButtons();
  });
  $('#btnDocx').addEventListener('click', exportDocx);

  $('#btnClearCurrent').addEventListener('click', () => {
    const ds = activeDataset();
    if (!ds) return;
    state.datasets = state.datasets.filter((d) => d.id !== ds.id);
    state.activeId = state.datasets[0]?.id || null;
    state.symbol = null;
    if (state.activeId) setActive(state.activeId);
    clearReport();
    persist();
    renderAll();
    toast(`已清除資料集「${ds.label}」`, 'ok');
  });
  // 二次確認（不使用 alert / confirm）
  let armed = null;
  $('#btnClearAll').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (!armed) {
      btn.textContent = '再按一次確認清除';
      armed = setTimeout(() => {
        armed = null;
        btn.textContent = '清除全部本機資料';
      }, 4000);
      return;
    }
    clearTimeout(armed);
    armed = null;
    btn.textContent = '清除全部本機資料';
    clearAll();
    state.datasets = [];
    state.activeId = state.symbol = state.start = state.end = null;
    clearReport();
    renderAll();
    toast('已清除全部本機資料（API Key 從未保存）', 'ok');
  });
}

async function init() {
  const loaded = loadState();
  if (loaded.warning) toast(loaded.warning, 'warn', 8000);
  Object.assign(state.prefs, loaded.prefs || {});
  state.datasets = loaded.datasets;
  $('#chkBB').checked = Boolean(state.prefs.showBB);
  bind();
  if (state.prefs.activeIsDemo) {
    const ds = buildDemoDataset();
    state.datasets.unshift(ds);
    state.activeId = ds.id;
  } else if (state.prefs.activeId && state.datasets.some((d) => d.id === state.prefs.activeId)) state.activeId = state.prefs.activeId;
  if (state.activeId) {
    state.symbol = state.prefs.symbol;
    setActive(state.activeId, { keepRange: true });
    state.start = state.prefs.start || null;
    state.end = state.prefs.end || null;
  }
  await renderAll();
  state.server = await getServerInfo();
  const note = $('#serverKeyNote');
  if (!state.server.ok) note.textContent = '無法連線本機代理伺服器（請以 npm run dev 或 npm start 啟動）；仍可使用資料、圖表、指標與匯出。';
  else if (state.server.serverKeyConfigured) note.textContent = `伺服器已設定 GROQ_API_KEY，可直接測試連線${state.server.allowClientKey ? '；亦可輸入自己的金鑰覆蓋' : ''}。`;
  else note.textContent = state.server.allowClientKey ? '伺服器未設定金鑰：請輸入自己的 Groq API Key（只存在本頁記憶體，經本機代理轉送，重新整理即消失）。' : '伺服器未設定金鑰且不允許前端金鑰，AI 分析不可用；可使用示範報告。';
  if (!state.server.allowClientKey && state.server.ok) $('#apiKey').disabled = true;
  updateAiButtons();
}

init();
