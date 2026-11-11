// 匯入對話框：CSV／PDF → 欄位對應 → 清洗預覽 → 使用者確認
import { h, clear, toast, fmt } from './dom.js';
import { LIMITS, ADJUSTMENT_LABELS } from '../config.js';
import { decodeBuffer, parseCsvText, detectHeaderRow, prepareTable, replacementRatio, autoMap, guessVolumeUnit } from '../data/csvImport.js';
import { extractPdf } from '../data/pdfImport.js';
import { cleanRows, FIELD_LABELS } from '../data/clean.js';
import { createDataset } from '../data/model.js';
import { errorsToCsv, downloadText } from '../export/csv.js';

const FIELDS = ['date', 'open', 'high', 'low', 'close', 'volume', 'symbol', 'name'];
const REQUIRED = ['date', 'open', 'high', 'low', 'close', 'volume'];

export function setupImportDialog({ onImported }) {
  const dlg = document.getElementById('dlgImport');
  const body = document.getElementById('importBody');
  const btnCheck = document.getElementById('btnImportCheck');
  const btnConfirm = document.getElementById('btnImportConfirm');
  let st = null;

  function closeDlg() {
    if (dlg.open) dlg.close();
    st = null;
  }

  function sel(options, value, onchange, attrs = {}) {
    const s = h('select', attrs, options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value) }, l)));
    s.addEventListener('change', () => onchange(s.value));
    return s;
  }

  function previewTable(headers, rows, n = 6) {
    return h(
      'div',
      { class: 'preview-tbl' },
      h('table', { class: 'mini' }, h('thead', {}, h('tr', {}, headers.map((x, i) => h('th', {}, `${i + 1}. ${x}`)))), h('tbody', {}, rows.slice(0, n).map((r) => h('tr', {}, headers.map((_, i) => h('td', {}, r[i] ?? '')))))),
    );
  }

  function render() {
    const fid = document.activeElement?.id;
    renderInner();
    if (fid && fid.startsWith('imp-')) document.getElementById(fid)?.focus();
  }

  function renderInner() {
    clear(body);
    if (!st) return;
    body.append(h('p', { class: 'hint' }, `檔案：${st.fileName}（${(st.fileSize / 1024).toFixed(1)} KB）・類型：${st.kind.toUpperCase()}`));
    if (st.fatal) {
      body.append(h('div', { class: 'err-box', role: 'alert' }, h('strong', {}, '無法建立行情資料：'), st.fatal.reason, st.fatal.suggestion ? h('div', {}, `可採取方式：${st.fatal.suggestion}`) : null));
      if (st.pdfPreview?.length) {
        body.append(h('h3', {}, '擷取到的前幾行文字（僅供判斷，不會轉為資料）'));
        body.append(h('pre', { class: 'pre' }, st.pdfPreview.map((l) => l.join(' | ')).join('\n')));
      }
      btnConfirm.disabled = true;
      btnCheck.disabled = true;
      return;
    }
    btnCheck.disabled = false;
    if (st.kind === 'csv') {
      const encOpts = [['utf-8', 'UTF-8'], ['big5', 'Big5（繁體中文舊編碼）']];
      const headerOpts = [['-1', '無標題列（手動指定欄位）'], ...st.allRows.slice(0, 15).map((r, i) => [String(i), `第 ${i + 1} 列：${r.slice(0, 4).join(', ').slice(0, 40)}`])];
      body.append(
        h(
          'div',
          { class: 'map-grid' },
          h('label', { class: 'fld' }, '文字編碼', sel(encOpts, st.encoding, (v) => { st.encoding = v; reparseCsv(); }, { id: 'imp-enc' })),
          h('label', { class: 'fld', style: 'grid-column: span 2' }, '標題列', sel(headerOpts, st.headerIdx, (v) => { st.headerIdx = Number(v); applyTable(prepareTable(st.allRows, st.headerIdx)); }, { id: 'imp-hdr' })),
        ),
      );
      if (st.encodingWarn) body.append(h('p', { class: 'warn' }, st.encodingWarn));
      if (st.parseErrors?.length) body.append(h('p', { class: 'warn' }, `解析提示：${st.parseErrors.slice(0, 3).join('；')}`));
    } else if (st.pdfInfo) body.append(h('p', { class: st.pdfInfo.warn ? 'warn' : 'hint' }, st.pdfInfo.text));

    body.append(h('h3', {}, '原始欄位與前數筆預覽'), previewTable(st.headers, st.body));

    const colOpts = [['-1', '（無）'], ...st.headers.map((x, i) => [String(i), `${i + 1}. ${x}`])];
    body.append(
      h('h3', {}, '欄位對應（* 為必要欄位）'),
      h(
        'div',
        { class: 'map-grid' },
        FIELDS.map((f) => h('label', { class: 'fld' }, `${FIELD_LABELS[f]}${REQUIRED.includes(f) ? ' *' : ''}`, sel(colOpts, st.mapping[f], (v) => { st.mapping[f] = Number(v); if (f === 'volume' && st.volumeUnit === '') st.volumeUnit = guessVolumeUnit(st.headers[Number(v)]) === '未知' ? '' : guessVolumeUnit(st.headers[Number(v)]); runCheck(); }, { id: `imp-map-${f}` }))),
      ),
    );

    const symInput = h('input', { id: 'imp-sym', value: st.symbol, placeholder: '例如 2330', maxlength: 12, 'aria-required': st.mapping.symbol < 0 });
    symInput.addEventListener('change', () => { st.symbol = symInput.value.trim().toUpperCase(); runCheck(); });
    const nameInput = h('input', { id: 'imp-name', value: st.name, placeholder: '例如 台積電', maxlength: 40 });
    nameInput.addEventListener('change', () => { st.name = nameInput.value.trim(); runCheck(); });
    const curInput = h('input', { id: 'imp-cur', value: st.currency, maxlength: 6 });
    curInput.addEventListener('change', () => { st.currency = curInput.value.trim().toUpperCase() || 'TWD'; });

    body.append(
      h('h3', {}, '資料集設定'),
      h(
        'div',
        { class: 'map-grid' },
        h('label', { class: 'fld' }, st.mapping.symbol < 0 ? '股票代碼 *（檔案無代碼欄）' : '股票代碼（檔案缺值時使用）', symInput),
        h('label', { class: 'fld' }, '股票名稱', nameInput),
        h('label', { class: 'fld' }, '成交量單位 *', sel([['', '請確認單位'], ['股', '股'], ['張', '張（1 張 = 1000 股）']], st.volumeUnit, (v) => { st.volumeUnit = v; runCheck(); }, { id: 'imp-vol' })),
        h('label', { class: 'fld' }, '還原權息狀態', sel(Object.entries(ADJUSTMENT_LABELS), st.adjustment, (v) => { st.adjustment = v; }, { id: 'imp-adj' })),
        h('label', { class: 'fld' }, '日期年份', sel([['auto', '自動判斷'], ['roc', '民國年'], ['ad', '西元年']], st.dateMode, (v) => { st.dateMode = v; runCheck(); }, { id: 'imp-date' })),
        h('label', { class: 'fld' }, '重複資料處理', sel([['first', '保留第一筆'], ['last', '保留最後一筆'], ['drop', '全部捨棄']], st.dupPolicy, (v) => { st.dupPolicy = v; st.dupConfirmed = false; runCheck(); }, { id: 'imp-dup' })),
        h('label', { class: 'fld' }, '幣別', curInput),
      ),
    );
    if (st.volumeUnitGuessed) body.append(h('p', { class: 'hint' }, `成交量單位依欄位名稱推測為「${st.volumeUnitGuessed}」，請確認。`));

    const res = h('div', { id: 'importResult' });
    body.append(h('h3', {}, '清洗結果預覽'), res);
    renderResult(res);
  }

  function renderResult(box) {
    clear(box);
    const r = st.result;
    if (!r) {
      box.append(h('p', { class: 'hint' }, st.blockReason || '請完成欄位對應。'));
      btnConfirm.disabled = true;
      return;
    }
    const s = r.stats;
    box.append(
      h(
        'div',
        { class: 'stat-row' },
        h('span', {}, `原始列數 ${s.raw}`),
        h('span', {}, `有效 ${s.valid}`),
        h('span', {}, `缺值 ${s.missing}`),
        h('span', {}, `異常 ${s.anomaly}`),
        h('span', {}, `日期歧義 ${s.ambiguous}`),
        h('span', {}, `重複組 ${s.duplicateGroups}`),
        h('span', {}, `略過非資料列 ${s.skippedNonData}`),
        h('span', {}, `日期範圍 ${s.dateRange ? `${s.dateRange[0]} ～ ${s.dateRange[1]}` : '—'}`),
        h('span', {}, `股票 ${s.symbols.join('、') || '—'}`),
      ),
    );
    box.append(h('ul', { class: 'notes' }, r.log.map((l) => h('li', {}, l))));
    if (s.ambiguous && st.dateMode === 'auto') box.append(h('p', { class: 'warn', role: 'alert' }, `有 ${s.ambiguous} 列日期年份為 1～2 位數，無法判斷民國或西元，請於「日期年份」指定。`));
    if (r.duplicates.length) {
      const chk = h('input', { id: 'imp-dupchk', type: 'checkbox', checked: st.dupConfirmed });
      chk.addEventListener('change', () => { st.dupConfirmed = chk.checked; renderResult(box); document.getElementById('imp-dupchk')?.focus(); });
      box.append(
        h('h3', {}, `重複資料（同股票代碼＋日期）共 ${r.duplicates.length} 組`),
        h('div', { class: 'preview-tbl' }, h('table', { class: 'mini' }, h('thead', {}, h('tr', {}, ['股票', '日期', '原檔列號', '各筆收盤'].map((x) => h('th', {}, x)))), h('tbody', {}, r.duplicates.slice(0, 30).map((d) => h('tr', {}, h('td', {}, d.symbol), h('td', {}, d.date), h('td', {}, d.rows.join('、')), h('td', {}, d.records.map((x) => fmt.num(x.close)).join('、'))))))),
        h('label', { class: 'chk' }, chk, '我已確認上述重複資料的處理方式'),
      );
    }
    if (r.errors.length) {
      box.append(
        h('h3', {}, `錯誤資料清單（${r.errors.length} 列，以下顯示前 20 列）`),
        h('div', { class: 'preview-tbl' }, h('table', { class: 'mini' }, h('thead', {}, h('tr', {}, ['列號', '原因', '原始內容'].map((x) => h('th', {}, x)))), h('tbody', {}, r.errors.slice(0, 20).map((e) => h('tr', {}, h('td', {}, e.row), h('td', {}, e.reasons.join('；')), h('td', {}, e.raw.join(' | ').slice(0, 120))))))),
        h('button', { type: 'button', class: 'btn btn-sm', onclick: () => downloadText(errorsToCsv(r.errors, st.headers), `錯誤資料_${st.fileName}.csv`) }, '下載錯誤資料 CSV'),
      );
    }
    const problems = [];
    if (!r.records.length) problems.push('沒有任何有效資料列');
    if (!st.volumeUnit) problems.push('請確認成交量單位');
    if (s.ambiguous && st.dateMode === 'auto') problems.push('請確認日期年份');
    if (r.duplicates.length && !st.dupConfirmed) problems.push('請確認重複資料處理方式');
    if (problems.length) box.append(h('p', { class: 'warn' }, `尚無法匯入：${problems.join('、')}`));
    else box.append(h('p', { class: 'ok-box' }, `可匯入 ${r.records.length} 筆有效資料。`));
    btnConfirm.disabled = problems.length > 0;
  }

  function runCheck() {
    if (!st || st.fatal) return;
    st.result = null;
    st.blockReason = null;
    const missing = REQUIRED.filter((f) => !(st.mapping[f] >= 0));
    if (missing.length) st.blockReason = `尚未對應必要欄位：${missing.map((f) => FIELD_LABELS[f]).join('、')}`;
    else if (st.mapping.symbol < 0 && !st.symbol) st.blockReason = '檔案沒有股票代碼欄位，請填寫股票代碼。';
    else if (st.body.length > LIMITS.MAX_ROWS) st.blockReason = `資料列數 ${st.body.length} 超過上限 ${LIMITS.MAX_ROWS}。`;
    else st.result = cleanRows(st.body, st.mapping, { symbol: st.symbol, name: st.name, dateMode: st.dateMode, duplicatePolicy: st.dupPolicy, rowOffset: st.rowOffset });
    render();
  }

  function applyTable(t) {
    st.headers = t.headers;
    st.body = t.body;
    st.mapping = t.mapping;
    st.rowOffset = t.rowOffset;
    if (t.titleGuess && !st.symbol) {
      st.symbol = t.titleGuess.symbol;
      st.name = st.name || t.titleGuess.name;
    }
    st.volumeUnitGuessed = t.volumeUnitGuess !== '未知' ? t.volumeUnitGuess : null;
    st.volumeUnit = st.volumeUnitGuessed || '';
    runCheck();
  }

  function reparseCsv() {
    const text = decodeBuffer(st.buffer, st.encoding);
    const ratio = replacementRatio(text);
    st.encodingWarn = ratio > 0.002 ? `偵測到 ${(ratio * 100).toFixed(1)}% 無法解碼的字元，檔案可能不是 ${st.encoding.toUpperCase()} 編碼，請嘗試切換編碼。` : null;
    const parsed = parseCsvText(text, LIMITS.MAX_ROWS);
    st.parseErrors = parsed.parseErrors;
    st.allRows = parsed.rows;
    if (!parsed.rows.length) {
      st.fatal = { reason: 'CSV 檔案沒有任何資料列。', suggestion: '請確認檔案內容。' };
      render();
      return;
    }
    if (parsed.truncated) st.parseErrors = [`資料超過 ${LIMITS.MAX_ROWS} 列，僅讀取前段`, ...st.parseErrors];
    st.headerIdx = detectHeaderRow(parsed.rows);
    applyTable(prepareTable(parsed.rows, st.headerIdx));
  }

  async function open(file) {
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    const isCsv = /\.(csv|txt)$/i.test(file.name) || /csv|text\/plain/.test(file.type);
    if (!isPdf && !isCsv) {
      toast('僅支援 CSV 或 PDF 檔案', 'err');
      return;
    }
    const max = isPdf ? LIMITS.PDF_MAX_BYTES : LIMITS.CSV_MAX_BYTES;
    if (file.size > max) {
      toast(`檔案 ${(file.size / 1048576).toFixed(1)} MB 超過上限 ${max / 1048576} MB`, 'err');
      return;
    }
    st = { fileName: file.name, fileSize: file.size, kind: isPdf ? 'pdf' : 'csv', encoding: 'utf-8', symbol: '', name: '', currency: 'TWD', volumeUnit: '', adjustment: 'unknown', dateMode: 'auto', dupPolicy: 'first', dupConfirmed: false, headers: [], body: [], mapping: {} };
    btnConfirm.disabled = true;
    clear(body).append(h('p', { class: 'status is-busy' }, '讀取檔案中…'));
    if (!dlg.open) dlg.showModal();
    try {
      st.buffer = await file.arrayBuffer();
      if (isCsv) {
        reparseCsv();
        if (st.encodingWarn && st.encoding === 'utf-8') {
          // 實際嘗試 Big5 解碼比較亂碼率
          const big5 = replacementRatio(decodeBuffer(st.buffer, 'big5'));
          const utf8 = replacementRatio(decodeBuffer(st.buffer, 'utf-8'));
          if (big5 < utf8) {
            st.encoding = 'big5';
            reparseCsv();
            toast('UTF-8 解碼出現亂碼，已自動改用 Big5，請確認預覽內容', 'warn');
          }
        }
      } else {
        const status = h('p', { class: 'status is-busy' }, '擷取 PDF 文字中…');
        clear(body).append(status);
        const res = await extractPdf(st.buffer, { maxPages: LIMITS.PDF_MAX_PAGES, onProgress: (p, n) => { status.textContent = `擷取 PDF 文字中…（${p}/${n} 頁）`; } });
        if (!res.ok) {
          st.fatal = { reason: res.reason, suggestion: res.suggestion };
          st.pdfPreview = res.previewLines;
          render();
          return;
        }
        const warnParts = [];
        if (res.pageCount > res.pagesRead) warnParts.push(`PDF 共 ${res.pageCount} 頁，僅讀取前 ${res.pagesRead} 頁`);
        if (res.reason) warnParts.push(res.reason);
        if (res.financialLike) warnParts.push('檔案同時含有財報類文字，僅擷取「日期開頭＋數值」之行情列，財報數據不會轉入');
        st.pdfInfo = { text: `已從 PDF 擷取 ${res.body.length} 列疑似行情資料。${warnParts.join('；')}。請確認欄位對應後再匯入。`, warn: warnParts.length > 0 };
        st.headers = res.headers;
        st.body = res.body;
        st.mapping = { ...Object.fromEntries(FIELDS.map((f) => [f, -1])), ...res.mapping };
        st.rowOffset = 1;
        if (res.titleGuess) {
          st.symbol = res.titleGuess.symbol;
          st.name = res.titleGuess.name;
        }
        const vg = st.mapping.volume >= 0 ? guessVolumeUnit(st.headers[st.mapping.volume]) : '未知';
        st.volumeUnitGuessed = vg !== '未知' ? vg : null;
        st.volumeUnit = st.volumeUnitGuessed || '';
        runCheck();
      }
    } catch (e) {
      st.fatal = { reason: `讀取失敗：${e?.message || e}`, suggestion: '請確認檔案未損毀，或改用 CSV。' };
      render();
    }
  }

  btnCheck.addEventListener('click', runCheck);
  btnConfirm.addEventListener('click', () => {
    if (!st?.result || btnConfirm.disabled) return;
    const r = st.result;
    const confirmLog = [
      `使用者確認：成交量單位「${st.volumeUnit}」`,
      `使用者確認：還原權息狀態「${ADJUSTMENT_LABELS[st.adjustment]}」`,
      `使用者確認：日期年份模式「${{ auto: '自動', roc: '民國', ad: '西元' }[st.dateMode]}」`,
      `使用者確認：欄位對應 ${FIELDS.filter((f) => st.mapping[f] >= 0).map((f) => `${FIELD_LABELS[f]}←${st.headers[st.mapping[f]]}`).join('、')}`,
    ];
    if (r.duplicates.length) confirmLog.push(`使用者確認：重複資料 ${r.duplicates.length} 組，${{ first: '保留第一筆', last: '保留最後一筆', drop: '全部捨棄' }[st.dupPolicy]}`);
    if (st.mapping.symbol < 0) confirmLog.push(`使用者補填股票代碼「${st.symbol}」${st.name ? `、名稱「${st.name}」` : ''}`);
    const ds = createDataset({
      label: `${st.fileName}`,
      records: r.records,
      source: `${st.kind === 'pdf' ? 'PDF' : 'CSV'} 匯入：${st.fileName}`,
      currency: st.currency || 'TWD',
      volumeUnit: st.volumeUnit,
      adjustmentStatus: st.adjustment,
      isDemo: false,
      cleaningLog: [...r.log, ...confirmLog],
      importSummary: { ...r.stats, errorCount: r.errors.length, errorsSample: r.errors.slice(0, 200), headers: st.headers },
    });
    onImported(ds, { mapping: st.mapping, encoding: st.encoding });
    closeDlg();
  });
  dlg.addEventListener('close', () => { st = null; });

  return { open, autoMap };
}
