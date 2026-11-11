# 台股個股資料分析與 Groq AI 洞察系統

資料匯入（CSV／PDF）→ 清洗 → 技術指標 → 互動圖表 → Groq AI 解讀 → CSV／Word 匯出。
**計算由程式完成，AI 只負責解讀。** 本系統不保證未來走勢或投資報酬。

## 快速開始

需求：Node.js ≥ 18.17（建議 20 或 22）

```bash
npm install          # 會自動複製 PDF.js 中文字型對照表到 public/pdfjs
npm run dev          # 同時啟動 API 代理 (127.0.0.1:8787) 與前端 (http://localhost:5173)
```

開啟 http://localhost:5173 → 按「載入範例資料」。無 API Key 也可使用資料、圖表、指標、表格、CSV／Word 匯出與示範報告。

AI 分析：於左側「Groq 連線」輸入自己的 API Key → 測試連線 → 選主要模型 → 開始 AI 分析。

```bash
npm test             # 單元測試（vitest）
npm run build        # 建置前端至 dist/
npm start            # 正式模式：由 Express 提供 dist/ 與 API（預設 http://127.0.0.1:8787）
npm run gen:sample   # 重新產生 sample-data/ 範例 CSV
```

## 目錄結構

```
server/
  app.js            Express 應用：Groq 代理（固定端點）、驗證、逾時、限流、來源限制、CSP
  index.js          啟動檔（讀 .env）
src/
  config.js         上限與常數
  main.js           UI 狀態管理與流程串接
  data/             model 標準資料模型｜clean 驗證清洗｜csvImport｜pdfImport｜demo 合成資料
  indicators/       indicators MA/EMA/RSI/MACD/KD/布林｜stats 區間統計
  analysis/         patterns K 線型態｜levels 支撐壓力
  charts/charts.js  ApexCharts 圖表控制
  ai/               prompts 提示詞模組｜payload 傳送資料建構｜client 呼叫、重試、備援
  report/render.js  Markdown 安全渲染、示範報告
  export/           csv（公式注入防護）｜docx（真正 .docx）
  storage/local.js  localStorage（不存金鑰）
  ui/               dom 工具｜table 表格｜importDialog 匯入流程
tests/              單元測試（5 檔）
sample-data/        範例 CSV／PDF（皆為合成，非真實行情）
scripts/            範例資料產生、PDF.js 資源複製
```

## 金鑰與部署

| 模式 | 金鑰來源 | 說明 |
|---|---|---|
| 本機示範（`npm run dev`） | 使用者在畫面輸入 | 只存在頁面記憶體，經本機代理以 header 轉送；不寫入 localStorage、網址或日誌；重新整理即消失 |
| 正式部署（`NODE_ENV=production`） | 伺服器環境變數 `GROQ_API_KEY` | 預設**不接受**前端自帶金鑰（`ALLOW_CLIENT_KEY=false`） |

設定：`cp .env.example .env` 後編輯。代理只會呼叫 `https://api.groq.com/openai/v1/models` 與 `/chat/completions`，前端無法指定其他網址。

**正式部署注意（本範例未實作，不等於企業級／金融級資安）：**
- 必須加上登入驗證、使用者層級配額與共享儲存的限流（目前為單機記憶體限流），否則任何人都能消耗你的 Groq 額度。
- 於反向代理設定 HTTPS，並把 `ALLOWED_ORIGINS` 限縮為正式網域。
- 預設只綁定 `127.0.0.1`；對外服務需調整 `HOST` 並放在反向代理之後。

## 計算規則摘要

| 項目 | 規則 |
|---|---|
| MA | 簡單平均；不足 n 筆為 null（不補 0） |
| EMA | 初始值 = 前 n 筆 SMA；α = 2/(n+1) |
| RSI(14) | Wilder 平滑；首值為前 14 個漲跌之簡單平均 |
| MACD(12,26,9) | DIF = EMA12−EMA26；訊號線 = DIF 之 EMA9；**柱狀值 = DIF−訊號線，未乘 2** |
| KD(9,3,3) | K、D 初始 50；K = 2/3·前K + 1/3·RSV；D = 2/3·前D + 1/3·K |
| 布林(20,2) | SMA20 ± 2 倍母體標準差 |
| 日報酬 | C_t/C_{t−1} − 1，只用區間內相鄰兩筆 |
| 日報酬標準差 | 樣本標準差；年化 = ×√252（假設 252 交易日） |
| 平均日內振幅 | (H−L)/前日收盤；與報酬波動率不同 |
| 最大回撤 | 收盤價相對歷史高點的最大跌幅 |
| 支撐壓力 | 局部高低點（±3 日）聚類（1.5%），回看 60 日，只用截止日前資料；**非固比 GMMA** |

指標以分析區間之前的歷史資料暖機；區間統計只使用選定期間。未還原權息時，除權息可能影響報酬與指標（畫面與報告會標示）。

## 限制上限

CSV ≤ 10 MB、PDF ≤ 20 MB／50 頁、資料 ≤ 50,000 列；送往 AI 的訊息 ≤ 24,000 字元（字元≠Token），伺服器端 ≤ 30,000 字元、請求本體 ≤ 200 KB；每 IP 每分鐘 30 次。

## 錯誤處理與重試

400／404／413 不重試；401／403 不重試、不切換備援；429 依 Retry-After（上限 30 秒）否則指數退避；5xx／逾時／網路錯誤指數退避＋抖動。**最多自動重試 2 次**，之後顯示「手動重試」。備援模型需使用者勾選允許，且只切換一次；取消後停止所有重試與切換。模型不支援 `max_completion_tokens` 時自動移除該參數再試。`finish_reason=length` 會顯示截斷警告。

## 已完成

- 範例資料（2 檔合成股票、各 160 平日，固定種子）、CSV（UTF-8／Big5 實際解碼、拖曳、標題列偵測、欄位別名、民國年、歧義確認、重複選擇、錯誤清單下載）
- PDF.js 文字層表格辨識（含中文 CMap、相容字正規化）、掃描檔／財報檔明確拒絕
- 指標、統計、5 種 K 線型態、支撐壓力、5 種圖表（同步縮放、對齊、自訂提示、缺值不畫 0）
- 表格排序／篩選／分頁／指標欄切換／匯出
- Groq 代理、模型清單、主要／備援模型、5 種分析類型、傳送資料預覽、取消、Token 與時間顯示（缺則「未提供」）
- 示範報告（明確標示非 AI）、CSV（BOM、單位欄名、公式注入防護）、Word（含圖表 PNG、模型、時間、聲明）
- localStorage（不存金鑰、版本與容量處理）、清除功能、RWD、鍵盤操作、無 alert

## 未完成／已知限制

- 財報 PDF 基本面分析：未實作（偵測到財報會說明無法建立 K 線）。
- 固比 GMMA：未實作。
- 掃描型 PDF 的 OCR：未實作，僅提示改用 OCR 或 CSV。
- 不同券商 PDF 版面差異大，表格辨識不保證成功；欄位無法辨識時需手動指定。
- 示範資料不含真實休市日；合成股名均標示「虛構」。
- Word 圖表為 ApexCharts 轉出的 PNG；若轉換失敗會在報告中註明未附入。
- 前端主程式 bundle 約 740 KB（ApexCharts 為主），PDF.js 與 docx 為動態載入。

## 驗收狀態

| 項目 | 狀態 |
|---|---|
| 全新安裝依 README 啟動 | ✅ 已驗證（npm ci → test → build → dev） |
| 無 Key 使用示範資料、圖表、指標、CSV 匯出 | ✅ 瀏覽器自動化驗證 |
| CSV 欄位對應、民國年、異常提示 | ✅ |
| PDF 解析預覽／失敗原因 | ✅（行情表、財報檔皆驗證） |
| 多股票不混算 | ✅ |
| 暖機期不顯示為 0 | ✅ |
| 日期篩選、圖表、統計一致 | ✅ |
| Groq 測試連線取得模型清單 | ⏳ **待使用者驗證**（開發環境無法連線 api.groq.com） |
| 有效金鑰完成真實分析 | ⏳ **待使用者驗證** |
| 無效金鑰、429、逾時、取消 | ✅ 單元／代理測試（模擬上游）；⏳ 真實上游待驗證 |
| 報告僅用輸入資料 | ✅ 資料範圍與股票隔離測試；AI 實際輸出待驗證 |
| 示範模式不偽裝 | ✅ |
| CSV／DOCX 可開啟 | ✅ CSV 含 BOM；DOCX 已解壓檢查結構 |
| 重新整理還原、不還原 Key | ✅ |
| 手機版主要功能 | ✅ 390px 寬無水平捲動 |

## 投資風險聲明

本系統提供之數據、指標與 AI 解讀僅供學習與參考，不構成任何投資建議；投資有風險，請自行判斷並承擔風險。
