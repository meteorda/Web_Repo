// 資料表格：排序、日期篩選、分頁、指標欄切換、匯出目前篩選結果
import { h, clear, fmt } from './dom.js';
import { INDICATOR_COLUMNS, quoteColumns } from '../export/csv.js';

export function createTable({ tableEl, pagerEl }) {
  const st = { rows: [], volumeUnit: '', groups: new Set(['ma']), sortKey: 'date', sortDir: -1, from: '', to: '', page: 0, size: 20 };

  const colDefs = () => {
    const cols = [
      { key: 'date', label: '日期', d: null },
      { key: 'open', label: '開盤', d: 2 },
      { key: 'high', label: '最高', d: 2 },
      { key: 'low', label: '最低', d: 2 },
      { key: 'close', label: '收盤', d: 2 },
      { key: 'chg', label: '漲跌', d: 2, sign: true },
      { key: 'volume', label: `成交量(${st.volumeUnit})`, d: 0 },
    ];
    const extra = {
      ma: [['ma5', 'MA5'], ['ma20', 'MA20'], ['ma60', 'MA60']],
      rsi: [['rsi14', 'RSI14']],
      macd: [['dif', 'DIF'], ['signal', '訊號線'], ['hist', 'MACD柱']],
      kd: [['k', 'K'], ['d', 'D']],
      bb: [['bbUpper', '布林上'], ['bbMid', '布林中'], ['bbLower', '布林下']],
    };
    for (const g of ['ma', 'rsi', 'macd', 'kd', 'bb']) if (st.groups.has(g)) for (const [k, l] of extra[g]) cols.push({ key: k, label: l, d: g === 'macd' ? 3 : 2 });
    return cols;
  };

  const filtered = () => {
    let r = st.rows.filter((x) => (!st.from || x.date >= st.from) && (!st.to || x.date <= st.to));
    const k = st.sortKey;
    r = [...r].sort((a, b) => {
      const va = a[k];
      const vb = b[k];
      if (va === null || va === undefined) return 1; // 空值排最後
      if (vb === null || vb === undefined) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * st.sortDir;
    });
    return r;
  };

  function render() {
    const cols = colDefs();
    const rows = filtered();
    const pages = Math.max(1, Math.ceil(rows.length / st.size));
    st.page = Math.min(st.page, pages - 1);
    const pageRows = rows.slice(st.page * st.size, (st.page + 1) * st.size);
    clear(tableEl);
    const thead = h(
      'thead',
      {},
      h(
        'tr',
        {},
        cols.map((c) =>
          h(
            'th',
            { scope: 'col', 'aria-sort': st.sortKey === c.key ? (st.sortDir > 0 ? 'ascending' : 'descending') : 'none' },
            h('button', { type: 'button', onclick: () => { if (st.sortKey === c.key) st.sortDir *= -1; else { st.sortKey = c.key; st.sortDir = -1; } render(); } }, c.label, st.sortKey === c.key ? (st.sortDir > 0 ? ' ▲' : ' ▼') : ''),
          ),
        ),
      ),
    );
    const tbody = h(
      'tbody',
      {},
      pageRows.length
        ? pageRows.map((r) =>
            h(
              'tr',
              {},
              cols.map((c) => {
                const v = r[c.key];
                if (c.d === null) return h('td', {}, v);
                if (v === null || v === undefined) return h('td', { class: 'na', title: '暖機期或無法計算' }, '—');
                if (c.sign) {
                  const dir = fmt.dirText(v);
                  return h('td', { class: dir.cls }, `${v > 0 ? '+' : ''}${fmt.num(v, c.d)}`);
                }
                return h('td', {}, fmt.num(v, c.d));
              }),
            ),
          )
        : h('tr', {}, h('td', { colspan: cols.length }, '篩選範圍內無資料')),
    );
    tableEl.append(thead, tbody);
    clear(pagerEl).append(
      h('span', {}, `共 ${rows.length} 筆，第 ${st.page + 1}／${pages} 頁`),
      h('button', { class: 'btn btn-sm', disabled: st.page === 0, onclick: () => { st.page = 0; render(); } }, '⏮'),
      h('button', { class: 'btn btn-sm', disabled: st.page === 0, onclick: () => { st.page -= 1; render(); }, 'aria-label': '上一頁' }, '‹ 上一頁'),
      h('button', { class: 'btn btn-sm', disabled: st.page >= pages - 1, onclick: () => { st.page += 1; render(); }, 'aria-label': '下一頁' }, '下一頁 ›'),
      h('button', { class: 'btn btn-sm', disabled: st.page >= pages - 1, onclick: () => { st.page = pages - 1; render(); } }, '⏭'),
    );
  }

  return {
    setData(rows, volumeUnit) {
      st.rows = rows;
      st.volumeUnit = volumeUnit;
      st.page = 0;
      render();
    },
    setGroups(groups) {
      st.groups = new Set(groups);
      render();
    },
    setFilter(from, to) {
      st.from = from || '';
      st.to = to || '';
      st.page = 0;
      render();
    },
    setSize(n) {
      st.size = n;
      st.page = 0;
      render();
    },
    /** 匯出目前篩選（依日期升冪）與勾選欄位 */
    exportColumns() {
      const cols = [...quoteColumns(st.volumeUnit)];
      for (const g of ['ma', 'rsi', 'macd', 'kd', 'bb']) if (st.groups.has(g)) cols.push(...INDICATOR_COLUMNS[g]);
      return cols;
    },
    filteredRows() {
      return filtered().sort((a, b) => (a.date < b.date ? -1 : 1));
    },
  };
}
