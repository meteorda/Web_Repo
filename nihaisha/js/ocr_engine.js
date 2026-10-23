/**
 * ocr_engine.js - 處方箋/藥單多模態視覺辨識與藥理結構化萃取模組
 * 職責：
 * 1. 圖片自適應 Canvas 等比縮放 (長寬 <= 1600px) 與 JPEG 0.82 壓縮 (<1MB)，防手機記憶體崩潰
 * 2. 多大模型 Vision API (Gemini / Claude / GPT-4o) 直傳適配器
 * 3. 藥理結構化提煉 (商品名/學名/劑量/頻率/適應症/病史)
 * 4. 浮動確認小卡與對話流/7-Slot 狀態機自動咬合
 * 嚴格物理隔離於 js/ 目錄，保證技能升級 0 污染。
 */

const PHARMACOLOGY_PROMPT = `你是一位精通中西醫藥理的資深臨床審方藥師與名醫助理。
請仔細閱讀病患上傳的處方箋、藥袋或藥盒照片，提取出清晰、客觀且專業的近期用藥清單：

【提取要求】：
1. 藥品名稱：完整列出藥品商品名 (Brand Name) 與通用學名 (Generic Name)；若為中藥，列出方劑名稱或組成藥材。
2. 劑量與規格：單顆毫克數 (mg)、每包克數、藥膏濃度 (%) 等。
3. 用法用量與頻次：如 每日兩次早晚飯後 (BID)、每晚睡前 (QHS)、需要時服用 (PRN)、外用局部塗抹等。
4. 適應症與科別：照片中若有記載醫院科別（如皮膚科、心臟內科）或診斷病名，請一併提取。
5. 服用時長：若處方箋標註天數（如連續處方箋 28 天）或病患自訴時長，請特別標註。

【輸出格式】：
請以簡潔清晰的條列式 Markdown 清單輸出，繁體中文（台灣習慣用語），結尾附帶一段簡要的西藥病理與副作用警示。格式範例：
📋【病患近期用藥紀錄】：
1. Prednisolone (口服皮質類固醇) 5mg - 每日早晚飯後各 1 顆 (BID)，已連續服用 3 年
2. Zyrtec (抗組織胺 Cetirizine) 10mg - 每晚睡前 1 顆 (QHS)
3. 局部類固醇外用藥膏 - 局部爆癢時塗抹
🏥 開立科別與診斷：皮膚科專科門診 / 慢性頑固性蕁麻疹
⚠️ 藥理審查提示：長期使用類固醇恐導致皮下毛孔閉鎖與水飲伏留，停藥易產生反彈。`;

class PrescriptionOCREngine {
    constructor() {
        this.maxDimension = 1600;
        this.jpegQuality = 0.82;
    }

    /**
     * 前端圖片自適應壓縮 (防 iOS/Android 48MP 記憶體溢出)
     * @param {File} file 
     * @returns {Promise<{base64: string, dataUrl: string, width: number, height: number, sizeBytes: number}>}
     */
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("讀取圖片檔案失敗"));
            reader.onload = (e) => {
                const img = new Image();
                img.onerror = () => reject(new Error("解析圖片內容失敗"));
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;

                    if (w > this.maxDimension || h > this.maxDimension) {
                        if (w > h) {
                            h = Math.round((h * this.maxDimension) / w);
                            w = this.maxDimension;
                        } else {
                            w = Math.round((w * this.maxDimension) / h);
                            h = this.maxDimension;
                        }
                    }

                    const canvas = document.createElement("canvas");
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, w, h);

                    const dataUrl = canvas.toDataURL("image/jpeg", this.jpegQuality);
                    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
                    const sizeBytes = Math.round((base64.length * 3) / 4);

                    console.log(`[OCR Engine] 圖片壓縮完成: ${img.width}x${img.height} -> ${w}x${h}, 體積: ${Math.round(sizeBytes / 1024)} KB`);
                    resolve({ base64, dataUrl, width: w, height: h, sizeBytes });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * 調用大模型多模態視覺端點執行 OCR
     */
    async recognizePrescription(compressedData, provider, apiKey) {
        if (!apiKey) {
            throw new Error("請先在右上角 ⚙️ API 設定中填寫 API 金鑰！");
        }

        console.log(`[OCR Engine] 正在調用 ${provider} Vision 端點進行藥單分析...`);

        if (provider === "google-gemini") {
            const payload = {
                contents: [{
                    parts: [
                        { text: PHARMACOLOGY_PROMPT },
                        { inlineData: { mimeType: "image/jpeg", data: compressedData.base64 } }
                    ]
                }]
            };

            const callVision = async (modelName) => {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                return await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            };

            let resp = await callVision("gemini-3.8-flash");
            if (!resp.ok && (resp.status === 503 || resp.status === 429)) {
                console.warn(`[Gemini Vision] 尖峰壅塞 (${resp.status})，等候 1.5 秒重試...`);
                await new Promise(r => setTimeout(r, 1500));
                resp = await callVision("gemini-3.8-flash");
            }
            if (!resp.ok && (resp.status === 404 || resp.status === 503)) {
                resp = await callVision("gemini-3.5-flash").catch(() => null) || await callVision("gemini-2.0-flash");
            }

            if (!resp.ok) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(`Gemini Vision 呼叫失敗 (${resp.status}): ${errJson.error?.message || resp.statusText}`);
            }

            const data = await resp.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "未能成功辨識藥單文字";
            return text;

        } else if (provider === "anthropic-claude") {
            const url = "https://api.anthropic.com/v1/messages";
            const payload = {
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                messages: [{
                    role: "user",
                    content: [
                        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: compressedData.base64 } },
                        { type: "text", text: PHARMACOLOGY_PROMPT }
                    ]
                }]
            };

            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(`Claude Vision 呼叫失敗 (${resp.status}): ${errJson.error?.message || resp.statusText}`);
            }

            const data = await resp.json();
            return data.content?.[0]?.text || "未能成功辨識藥單文字";

        } else if (provider === "openai-gpt") {
            // 本地經由 server.py /api/proxy 轉發解決 CORS
            const targetUrl = "https://api.openai.com/v1/chat/completions";
            const reqBody = {
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: PHARMACOLOGY_PROMPT },
                        { type: "image_url", image_url: { url: compressedData.dataUrl } }
                    ]
                }],
                max_tokens: 1024
            };

            const resp = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: targetUrl,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: reqBody
                })
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`OpenAI Vision 呼叫失敗 (${resp.status}): ${errText}`);
            }

            const data = await resp.json();
        } else if (provider === "groq-cloud") {
            // GroqCloud 視覺端點 (llama-3.2-11b-vision-preview 經由本地 server.py /api/proxy 轉發)
            const targetUrl = "https://api.groq.com/openai/v1/chat/completions";
            const reqBody = {
                model: "llama-3.2-11b-vision-preview",
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: PHARMACOLOGY_PROMPT },
                        { type: "image_url", image_url: { url: compressedData.dataUrl } }
                    ]
                }],
                max_tokens: 1024
            };

            const resp = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: targetUrl,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
                    },
                    body: reqBody
                })
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`GroqCloud Vision 呼叫失敗 (${resp.status}): ${errText}`);
            }

            const data = await resp.json();
            return data.choices?.[0]?.message?.content || "未能成功辨識藥單文字";

        } else {
            // 本地模型或不支援 Vision 時提示
            throw new Error(`當前所選模型 (${provider}) 不支援原生 Vision 視覺端點，建議切換為 Google Gemini (gemini-3.8-flash) 獲得最佳辨識率！`);
        }
    }

    /**
     * 彈出確認小卡供病患核對與微調
     */
    showConfirmationModal(extractedText, onConfirm, onCancel) {
        let modal = document.getElementById("ocr_confirm_modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "ocr_confirm_modal";
            modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4";
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
                <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 class="text-lg font-bold text-emerald-400 flex items-center gap-2">
                        <span>💊</span> 核對近期用藥與處方箋紀錄
                    </h3>
                    <button id="ocr_modal_close" class="text-slate-400 hover:text-white text-xl">✕</button>
                </div>
                <div class="my-4 text-xs text-slate-400">
                    💡 提示：若手寫字有辨識誤差，您可直接在下方編輯框中微調文字，確認後將作為主訴送交虛擬倪師進行深入審計。
                </div>
                <div class="flex-1 overflow-y-auto mb-4">
                    <textarea id="ocr_editable_text" class="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono resize-none leading-relaxed"></textarea>
                </div>
                <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button id="ocr_btn_cancel" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition">
                        捨棄取消
                    </button>
                    <button id="ocr_btn_confirm" class="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition flex items-center gap-2">
                        <span>✅</span> 確認送出至問診室
                    </button>
                </div>
            </div>
        `;

        const textarea = document.getElementById("ocr_editable_text");
        textarea.value = extractedText;

        const closeModal = () => {
            modal.classList.add("hidden");
            if (onCancel) onCancel();
        };

        modal.classList.remove("hidden");
        document.getElementById("ocr_modal_close").onclick = closeModal;
        document.getElementById("ocr_btn_cancel").onclick = closeModal;

        document.getElementById("ocr_btn_confirm").onclick = () => {
            const finalContent = textarea.value.trim();
            modal.classList.add("hidden");
            if (onConfirm) onConfirm(finalContent);
        };
    }
}

// 導出全域單例
window.ocrEngine = new PrescriptionOCREngine();
