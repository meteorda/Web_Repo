// DOM 工具：安全建立元素（不使用 innerHTML 插入匯入資料）、通知、格式化

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** h('div', {class:'x', onclick}, child...) — 文字一律以 textContent 寫入 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function toast(message, type = 'info', ms = 4500) {
  const box = document.getElementById('toasts');
  const close = h('button', { 'aria-label': '關閉通知' }, '✕');
  const t = h('div', { class: `toast ${type}`, role: type === 'err' ? 'alert' : 'status' }, h('span', {}, message), close);
  close.addEventListener('click', () => t.remove());
  box.append(t);
  if (ms) setTimeout(() => t.remove(), ms);
}

export function setStatus(el, text, kind = '') {
  el.textContent = text || '';
  el.className = `status${kind ? ` is-${kind}` : ''}`;
}

export const fmt = {
  num(v, d = 2) {
    return v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  int(v) {
    return v === null || v === undefined || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('zh-TW');
  },
  pct(v) {
    return v === null || v === undefined || !Number.isFinite(v) ? '無法計算' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
  },
  /** 不帶正負號的百分比（波動、振幅等非方向性數值） */
  pctAbs(v) {
    return v === null || v === undefined || !Number.isFinite(v) ? '無法計算' : `${(v * 100).toFixed(2)}%`;
  },
  /** 漲跌：正負號 + 文字，不只依賴顏色 */
  dirText(v) {
    if (v === null || v === undefined || !Number.isFinite(v)) return { text: '無法計算', cls: 'flat' };
    if (v > 0) return { text: '▲ 上漲', cls: 'up' };
    if (v < 0) return { text: '▼ 下跌', cls: 'down' };
    return { text: '— 平盤', cls: 'flat' };
  },
};

export function fileSafe(s) {
  return String(s).replace(/[\\/:*?"<>|\s]+/g, '_');
}
