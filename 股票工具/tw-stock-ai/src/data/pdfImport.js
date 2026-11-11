// PDF 匯入：以 PDF.js 擷取文字與位置，嘗試辨識行情表格
// 純函式 groupItemsToLines / analyzeLines 可於 Node 測試；extractPdf 需瀏覽器環境
import { autoMap, guessSymbolFromTitle } from './csvImport.js';
import { parseDate, parseNumber } from './clean.js';

const FIN_KEYWORDS = /營業收入|營收|每股盈餘|EPS|資產負債|損益表|毛利率|淨利|股東權益|現金流量/i;

/**
 * 將文字項目依 y 座標分行、依 x 座標排序並合併相鄰項目為儲存格
 * @param {{str:string,x:number,y:number,w:number}[]} items
 */
export function groupItemsToLines(items, yTol = 3, gapTol = 4) {
  // NFKC：把 PDF 字型常見的康熙部首／相容字（如「⽇」「⾼」）正規化為一般漢字
  const valid = items.filter((it) => it.str && it.str.trim() !== '').map((it) => ({ ...it, str: it.str.normalize('NFKC') }));
  valid.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of valid) {
    let line = lines.find((l) => Math.abs(l.y - it.y) <= yTol);
    if (!line) {
      line = { y: it.y, items: [] };
      lines.push(line);
    }
    line.items.push(it);
  }
  lines.sort((a, b) => b.y - a.y);
  return lines.map((l) => {
    l.items.sort((a, b) => a.x - b.x);
    const cells = [];
    let cur = null;
    for (const it of l.items) {
      if (cur && it.x - (cur.x + cur.w) <= gapTol && !/\s$/.test(cur.str) && !/^\s/.test(it.str)) {
        cur.str += it.str;
        cur.w = it.x + it.w - cur.x;
      } else {
        cur = { str: it.str, x: it.x, w: it.w };
        cells.push(cur);
      }
    }
    return cells.flatMap((c) => c.str.trim().split(/\s+/)).map((s) => s.trim()).filter(Boolean);
  });
}

function isDataLine(cells) {
  if (cells.length < 6) return false;
  const d = parseDate(cells[0], 'auto');
  if (d.status === 'invalid') return false;
  const nums = cells.slice(1).filter((c) => parseNumber(c).status === 'ok').length;
  return nums >= 5;
}

/**
 * 分析各行，找出行情表格
 * @returns {{ ok:boolean, reason?:string, suggestion?:string, headers?:string[], body?:string[][], mapping?:object, financialLike?:boolean }}
 */
export function analyzeLines(lines, totalTextLength) {
  if (totalTextLength < 20) {
    return {
      ok: false,
      reason: 'PDF 幾乎沒有可擷取的文字層，可能為掃描圖片型 PDF。',
      suggestion: '請先以 OCR 軟體轉成可選取文字的 PDF，或改用證交所／券商下載的 CSV。',
    };
  }
  let headerIdx = -1;
  let bestScore = 0;
  lines.forEach((cells, i) => {
    const m = autoMap(cells);
    const score = ['date', 'open', 'high', 'low', 'close', 'volume'].filter((f) => m[f] !== -1).length;
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  });
  const dataLines = lines.filter(isDataLine);
  const allText = lines.map((l) => l.join(' ')).join('\n');
  const financialLike = FIN_KEYWORDS.test(allText);

  if (!dataLines.length) {
    return {
      ok: false,
      financialLike,
      reason: financialLike
        ? '偵測到財報類內容（營收、EPS 等），但找不到「日期＋開高低收＋成交量」的行情表格，無法據此建立 K 線。'
        : '找不到以日期開頭且含 5 個以上數值欄位的行情表格。',
      suggestion: '財報基本面分析列為後續擴充；請改用含每日行情的 CSV 或行情表 PDF。',
    };
  }
  let headers;
  let mapping;
  const width = Math.max(...dataLines.map((l) => l.length));
  if (headerIdx >= 0 && bestScore >= 4) {
    headers = lines[headerIdx];
    // 行情列欄數與標題欄數不同時，以資料欄數為準補齊
    if (headers.length < width) headers = [...headers, ...Array.from({ length: width - headers.length }, (_, i) => `欄${headers.length + i + 1}`)];
    mapping = autoMap(headers);
  } else {
    headers = Array.from({ length: width }, (_, i) => `欄${i + 1}`);
    mapping = { date: 0, open: -1, high: -1, low: -1, close: -1, volume: -1, symbol: -1, name: -1 };
  }
  return {
    ok: true,
    financialLike,
    headers,
    body: dataLines.map((l) => [...l, ...Array(Math.max(0, width - l.length)).fill('')]),
    mapping,
    headerFound: headerIdx >= 0 && bestScore >= 4,
    titleGuess: headerIdx > 0 ? guessSymbolFromTitle(lines, headerIdx) : null,
    reason: headerIdx >= 0 && bestScore >= 4 ? null : '未找到可辨識的標題列，請手動指定各欄位。',
  };
}

/** 瀏覽器端：讀取 PDF 並回傳分析結果 */
export async function extractPdf(arrayBuffer, { maxPages = 50, onProgress } = {}) {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      isEvalSupported: false,
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
    }).promise;
  } catch (e) {
    return { ok: false, reason: `PDF 無法開啟：${e?.name === 'PasswordException' ? '檔案受密碼保護' : e?.message || '格式錯誤'}`, suggestion: '請確認檔案未加密且未損毀，或改用 CSV。' };
  }
  const pages = Math.min(doc.numPages, maxPages);
  const allLines = [];
  let textLen = 0;
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items
      .filter((it) => 'str' in it)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0 }));
    textLen += items.reduce((s, it) => s + it.str.trim().length, 0);
    allLines.push(...groupItemsToLines(items));
    onProgress?.(p, pages);
  }
  const res = analyzeLines(allLines, textLen);
  res.pageCount = doc.numPages;
  res.pagesRead = pages;
  res.previewLines = allLines.slice(0, 12);
  return res;
}
