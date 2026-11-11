// 將 PDF.js 的 CMap 與標準字型複製到 public/，供中文（CID 字型）PDF 解析使用
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules/pdfjs-dist');
const dst = path.join(root, 'public/pdfjs');
for (const dir of ['cmaps', 'standard_fonts']) {
  const from = path.join(src, dir);
  if (!fs.existsSync(from)) {
    console.warn(`[pdfjs] 找不到 ${from}，略過`);
    continue;
  }
  fs.cpSync(from, path.join(dst, dir), { recursive: true });
}
console.log('[pdfjs] 已複製 cmaps 與 standard_fonts 至 public/pdfjs');
