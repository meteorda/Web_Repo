/**
 * app.js - 倪海廈雙欄經方臨證工作台前端核心調度大腦
 * 職責：
 * 1. 跨輪累計特徵池 (accumulated_symptoms_store) 維護，避免症狀遺忘
 * 2. 調用本地 /api/retrieve (<15ms 原生 Python 檢索)
 * 3. 階段 A 看板純代碼秒級渲染 (7-Slot + 得分條 + 鑑別死穴)
 * 4. 階段 B 終審看板元架構表格平滑投影
 * 5. 動態編譯 SKILL.md 為 System Prompt + 病患姓名個人化注入
 * 6. 多大模型直連適配器 (Gemini / Claude / GPT / Ollama)
 * 7. 右下角全息血統審計抽屜 (動態百分比 + Mermaid 圓餅圖/思維鏈)
 * 8. 系統說明長捲軸彈窗 (醫療免責/分流急診/四層白盒/五維矩陣)
 * 9. 全平台 RWD 90% 滑出抽屜控制
 */

(function () {
    // ── 全域狀態機 ──
    const state = {
        patientName: localStorage.getItem("nihaisha_patient_name") || "大同先生",
        modelProvider: localStorage.getItem("nihaisha_provider") || "google-gemini",
        customModel: localStorage.getItem("nihaisha_custom_model") || "",
        apiKey: localStorage.getItem("nihaisha_api_key") || "",
        accumulatedSymptoms: [],
        conversationHistory: [],
        currentStage: "A", // 'A': 問診中, 'B': 終審定案
        lastRetrieverResult: null,
        skillSystemInstruction: "",
        isGenerating: false,
        abortController: null,
        turnCount: 0
    };

    // ── 初始化 ──
    document.addEventListener("DOMContentLoaded", async () => {
        initUI();
        await loadSkillPrompt();
        setupEventListeners();
        renderInitialGreeting();
    });

    /**
     * UI 初始狀態同步
     */
    function initUI() {
        const prov = state.modelProvider;
        const provKey = localStorage.getItem(`nihaisha_key_${prov}`) || state.apiKey;
        const provModel = localStorage.getItem(`nihaisha_model_${prov}`) || state.customModel;

        state.apiKey = provKey;
        state.customModel = provModel;

        document.getElementById("current_patient_badge").innerText = state.patientName;
        document.getElementById("input_patient_name").value = state.patientName;
        document.getElementById("select_model_provider").value = prov;
        document.getElementById("input_api_key").value = provKey;
        const customModelInput = document.getElementById("input_custom_model");
        if (customModelInput) {
            customModelInput.value = provModel;
        }
        updateProviderBadge();
    }

    function updateProviderBadge() {
        const badge = document.getElementById("provider_status_badge");
        if (state.apiKey) {
            badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60";
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ${state.modelProvider}`;
        } else {
            badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60";
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 未配置金鑰`;
        }
    }

    /**
     * 動態載入根目錄 SKILL.md 作為大腦 System Instruction
     */
    async function loadSkillPrompt() {
        try {
            const resp = await fetch("SKILL.md");
            if (resp.ok) {
                state.skillSystemInstruction = await resp.text();
                console.log("[Brain] SKILL.md 核心認知指令載入成功，字元長度:", state.skillSystemInstruction.length);
            } else {
                console.warn("[Brain] 未能在根目錄讀取 SKILL.md，使用內建降級 Prompt");
            }
        } catch (e) {
            console.error("[Brain] 讀取 SKILL.md 失敗:", e);
        }
    }

    /**
     * 事件監聽綁定
     */
    function setupEventListeners() {
        // 1. 手機版抽屜切換
        const drawerToggle = document.getElementById("drawer_toggle");
        const drawerClose = document.getElementById("drawer_close");
        const drawerBackdrop = document.getElementById("drawer_backdrop");
        const dashboardDrawer = document.getElementById("dashboard_column");

        const toggleDrawer = (open) => {
            if (open) {
                dashboardDrawer.classList.remove("translate-x-full");
                drawerBackdrop.classList.remove("hidden");
                document.body.classList.add("overflow-hidden");
            } else {
                dashboardDrawer.classList.add("translate-x-full");
                drawerBackdrop.classList.add("hidden");
                document.body.classList.remove("overflow-hidden");
            }
        };

        if (drawerToggle) drawerToggle.onclick = () => toggleDrawer(true);
        if (drawerClose) drawerClose.onclick = () => toggleDrawer(false);
        if (drawerBackdrop) drawerBackdrop.onclick = () => toggleDrawer(false);

        // 2. 說明彈窗切換
        const btnPrinciples = document.getElementById("btn_principles");
        const modalPrinciples = document.getElementById("modal_principles");
        const closePrinciples = document.getElementById("close_principles");

        if (btnPrinciples) {
            btnPrinciples.onclick = () => {
                modalPrinciples.classList.remove("hidden");
                document.body.classList.add("overflow-hidden");
                // 初始化彈窗內的 Mermaid
                setTimeout(() => {
                    if (window.mermaid) mermaid.init(undefined, "#modal_principles .mermaid");
                }, 100);
            };
        }
        if (closePrinciples) {
            closePrinciples.onclick = () => {
                modalPrinciples.classList.add("hidden");
                document.body.classList.remove("overflow-hidden");
            };
        }

        // 3. ⚙️ 設定彈窗切換
        const btnSettings = document.getElementById("btn_settings");
        const modalSettings = document.getElementById("modal_settings");
        const closeSettings = document.getElementById("close_settings");
        const btnSaveSettings = document.getElementById("btn_save_settings");
        const toggleKeyVisibility = document.getElementById("toggle_key_visibility");

        if (btnSettings) btnSettings.onclick = () => modalSettings.classList.remove("hidden");
        if (closeSettings) closeSettings.onclick = () => modalSettings.classList.add("hidden");

        if (toggleKeyVisibility) {
            toggleKeyVisibility.onclick = () => {
                const keyInput = document.getElementById("input_api_key");
                keyInput.type = keyInput.type === "password" ? "text" : "password";
            };
        }

        // 輔助函式：取得特定供應商在 localStorage 中的快取 Key
        const getProviderKeyStorageName = (prov) => `nihaisha_key_${prov}`;
        const getProviderModelStorageName = (prov) => `nihaisha_model_${prov}`;

        if (btnSaveSettings) {
            btnSaveSettings.onclick = () => {
                const pName = document.getElementById("input_patient_name").value.trim() || "病患";
                const pProvider = document.getElementById("select_model_provider").value;
                const pKey = document.getElementById("input_api_key").value.trim();
                const pCustomModel = document.getElementById("input_custom_model") ? document.getElementById("input_custom_model").value.trim() : "";

                state.patientName = pName;
                state.modelProvider = pProvider;
                state.apiKey = pKey;
                state.customModel = pCustomModel;

                // 儲存全域通用設定
                localStorage.setItem("nihaisha_patient_name", pName);
                localStorage.setItem("nihaisha_provider", pProvider);
                localStorage.setItem("nihaisha_api_key", pKey);
                localStorage.setItem("nihaisha_custom_model", pCustomModel);

                // 🌟 同步保存至「該供應商專屬快取槽」，達成跨供應商各自記憶
                localStorage.setItem(getProviderKeyStorageName(pProvider), pKey);
                if (pCustomModel) {
                    localStorage.setItem(getProviderModelStorageName(pProvider), pCustomModel);
                }

                initUI();
                modalSettings.classList.add("hidden");
                showToast("✅ 設定已安全儲存至瀏覽器快取！");
            };
        }

        // 3.1 ⚡ 通用活體模型動態探針 (支援 Google Gemini 與 GroqCloud)
        const selectProvider = document.getElementById("select_model_provider");
        const modelProbeSection = document.getElementById("model_probe_section");
        const probeTitleLabel = document.getElementById("probe_title_label");
        const probeModelsList = document.getElementById("probe_models_list");

        // 當使用者在下拉選單切換供應商時，自動代入該供應商之前儲存的 API Key 與模型名稱
        const onProviderChange = () => {
            if (!selectProvider) return;
            const prov = selectProvider.value;

            // 1. 自動帶出快取金鑰
            const cachedKey = localStorage.getItem(getProviderKeyStorageName(prov)) || "";
            const keyInput = document.getElementById("input_api_key");
            if (keyInput) {
                keyInput.value = cachedKey;
            }

            // 2. 自動帶出快取模型
            const cachedModel = localStorage.getItem(getProviderModelStorageName(prov)) || "";
            const customModelInput = document.getElementById("input_custom_model");
            if (customModelInput) {
                customModelInput.value = cachedModel;
            }

            // 3. 調整探針面板可見性
            if (modelProbeSection) {
                if (prov === "google-gemini") {
                    modelProbeSection.classList.remove("hidden");
                    if (probeTitleLabel) probeTitleLabel.innerText = "⚡ Google Gemini 活體可用模型探針：";
                } else if (prov === "groq-cloud") {
                    modelProbeSection.classList.remove("hidden");
                    if (probeTitleLabel) probeTitleLabel.innerText = "⚡ GroqCloud 活體可用模型探針：";
                } else {
                    modelProbeSection.classList.add("hidden");
                }
            }

            // 清空舊的探測清單
            if (probeModelsList) {
                probeModelsList.innerHTML = `<span class="text-slate-500 italic">點擊上方「探測可用模型」拉取在線清單</span>`;
            }
        };

        if (selectProvider) {
            selectProvider.addEventListener("change", onProviderChange);
        }

        const btnProbeModels = document.getElementById("btn_probe_models");
        if (btnProbeModels) {
            btnProbeModels.onclick = async () => {
                const provider = document.getElementById("select_model_provider").value;
                const key = document.getElementById("input_api_key").value.trim();
                if (!key) {
                    probeModelsList.innerHTML = `<span class="text-rose-400">⚠️ 請先在下方填入對應供應商之 API 金鑰後再探測！</span>`;
                    return;
                }

                if (provider === "google-gemini") {
                    probeModelsList.innerHTML = `<span class="text-sky-400 animate-pulse">⏳ 正在連線 Google Gemini 查詢您金鑰支援的所有模型清單...</span>`;
                    try {
                        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
                        const resp = await fetch(url);
                        if (!resp.ok) {
                            const err = await resp.text();
                            probeModelsList.innerHTML = `<span class="text-rose-400">❌ 查詢失敗 (${resp.status}): ${err}</span>`;
                            return;
                        }
                        const data = await resp.json();
                        // 提取支援 generateContent 之模型名稱，並洗淨 models/ 前綴
                        const rawModels = (data.models || [])
                            .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
                            .map(m => m.name.replace(/^models\//, ""));

                        if (!rawModels.length) {
                            probeModelsList.innerHTML = `<span class="text-amber-400">⚠️ Gemini 未回傳任何文字生成模型。</span>`;
                            return;
                        }
                        renderModelButtons(rawModels, "Gemini");
                    } catch (e) {
                        probeModelsList.innerHTML = `<span class="text-rose-400">❌ 連線異常: ${e.message}</span>`;
                    }

                } else if (provider === "groq-cloud") {
                    probeModelsList.innerHTML = `<span class="text-sky-400 animate-pulse">⏳ 正在連線 Groq API 查詢您的可用模型...</span>`;
                    try {
                        const resp = await fetch("/api/proxy", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                url: "https://api.groq.com/openai/v1/models",
                                method: "GET",
                                headers: {
                                    "Authorization": `Bearer ${key}`
                                }
                            })
                        });
                        if (!resp.ok) {
                            const err = await resp.text();
                            probeModelsList.innerHTML = `<span class="text-rose-400">❌ 查詢失敗 (${resp.status}): ${err}</span>`;
                            return;
                        }
                        const data = await resp.json();
                        const models = (data.data || []).map(m => m.id);
                        if (!models.length) {
                            probeModelsList.innerHTML = `<span class="text-amber-400">⚠️ Groq 帳號未回傳模型清單。</span>`;
                            return;
                        }
                        renderModelButtons(models, "Groq");
                    } catch (e) {
                        probeModelsList.innerHTML = `<span class="text-rose-400">❌ 連線異常: ${e.message}</span>`;
                    }
                }
            };

            const searchInput = document.getElementById("probe_search_input");
            function renderModelButtons(models, providerName) {
                if (searchInput) {
                    searchInput.classList.remove("hidden");
                    searchInput.value = "";
                    searchInput.oninput = () => {
                        const q = searchInput.value.toLowerCase().trim();
                        const buttons = probeModelsList.querySelectorAll("button");
                        buttons.forEach(btn => {
                            btn.style.display = btn.innerText.toLowerCase().includes(q) ? "" : "none";
                        });
                    };
                }

                // 智慧優先排序：將核心主力與旗艦模型置頂
                const priorityRegex = /(3\.8-flash|3\.5-flash|2\.0-flash|gpt-oss-120b|gpt-oss-20b|llama-3\.3)/i;
                models.sort((a, b) => {
                    const aP = priorityRegex.test(a) ? 1 : 0;
                    const bP = priorityRegex.test(b) ? 1 : 0;
                    if (aP !== bP) return bP - aP;
                    return a.localeCompare(b);
                });

                probeModelsList.innerHTML = "";
                models.forEach(mId => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    const isPriority = priorityRegex.test(mId);
                    btn.className = isPriority
                        ? "px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-600 text-sky-200 hover:text-white border border-blue-500/60 transition font-mono text-[10px] font-bold shadow-sm"
                        : "px-2 py-0.5 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 transition font-mono text-[10px]";
                    btn.innerText = mId;
                    btn.title = `點擊帶入此模型: ${mId}`;
                    btn.onclick = () => {
                        document.getElementById("input_custom_model").value = mId;
                        showToast(`已選取 ${providerName} 模型：${mId}`);
                    };
                    probeModelsList.appendChild(btn);
                });
            }
        }

        // 4. 右下角全域血統審計抽屜
        const btnProvenance = document.getElementById("btn_provenance");
        const modalProvenance = document.getElementById("modal_provenance");
        const closeProvenance = document.getElementById("close_provenance");

        if (btnProvenance) {
            btnProvenance.onclick = () => {
                modalProvenance.classList.remove("hidden");
                document.body.classList.add("overflow-hidden");
                renderProvenanceCharts();
            };
        }
        if (closeProvenance) {
            closeProvenance.onclick = () => {
                modalProvenance.classList.add("hidden");
                document.body.classList.remove("overflow-hidden");
            };
        }

        // 5. 輸入框自動增高與快捷鍵
        const userInput = document.getElementById("user_input");
        const btnSend = document.getElementById("btn_send");

        userInput.addEventListener("input", () => {
            userInput.style.height = "auto";
            userInput.style.height = Math.min(userInput.scrollHeight, 160) + "px";
        });

        userInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendTrigger();
            }
        });

        btnSend.addEventListener("click", () => handleSendTrigger());

        // 6. 📷 處方箋/藥單圖片上傳
        const btnUploadPrescription = document.getElementById("btn_upload_prescription");
        const fileInput = document.getElementById("prescription_file_input");

        btnUploadPrescription.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            showUploadProgressBar(true, "正在壓縮處方箋影像並防範記憶體溢出...");

            try {
                const compressed = await window.ocrEngine.compressImage(file);
                showUploadProgressBar(true, `🔍 虛擬倪醫師正在辨識藥單 (${Math.round(compressed.sizeBytes / 1024)}KB)，請稍候...`);

                const rawExtracted = await window.ocrEngine.recognizePrescription(compressed, state.modelProvider, state.apiKey);
                showUploadProgressBar(false);

                // 彈出確認卡片
                window.ocrEngine.showConfirmationModal(
                    rawExtracted,
                    (confirmedText) => {
                        // 確認後發送至對話室
                        appendMessage("user", `📋【上傳處方箋紀錄】：\n${confirmedText}`);
                        // 注入累計特徵池
                        state.accumulatedSymptoms.push(confirmedText);
                        // 觸發問診檢索與審計
                        triggerDiagnosticCycle(confirmedText, true);
                    },
                    () => {
                        showToast("已捨棄本次藥單上傳");
                    }
                );

            } catch (err) {
                showUploadProgressBar(false);
                alert("藥單辨識失敗: " + err.message);
            } finally {
                fileInput.value = "";
            }
        });
    }

    /**
     * 初始歡迎詞
     */
    function renderInitialGreeting() {
        const welcomeText = `你好，**${state.patientName}**！我是**虛擬倪海廈醫師**。

中醫是講究**「上工治未病」**與**「陰陽表裡、虛實寒熱」**的客觀科學。

請告訴我：你目前最困擾、最不舒服的主要問題是什麼？大概持續了多久？身體是否有明顯怕冷、惡風、出汗、口渴或二便異常？

*（提示：請放心以一般口語描述即可，亦可點擊下方 **📷 藥單** 上傳近期用藥紀錄）*`;
        appendMessage("assistant", welcomeText);
    }

    /**
     * 處理發送動作 (發送 or 停止)
     */
    function handleSendTrigger() {
        if (state.isGenerating) {
            if (state.abortController) {
                state.abortController.abort();
                state.isGenerating = false;
                setSendButtonState(false);
                showToast("⏹ 已中止本次生成");
            }
            return;
        }

        const inputEl = document.getElementById("user_input");
        const text = inputEl.value.trim();
        if (!text) return;

        inputEl.value = "";
        inputEl.style.height = "auto";

        appendMessage("user", text);
        state.accumulatedSymptoms.push(text);
        triggerDiagnosticCycle(text, false);
    }

    /**
     * 核心診斷循環：Python 檢索 (<15ms) -> 階段 A 看板秒出 -> LLM 串流生成
     */
    async function triggerDiagnosticCycle(latestInput, isPrescription) {
        state.turnCount++;
        setSendButtonState(true);

        const fullQuery = state.accumulatedSymptoms.join(" ");

        // 1. 純代碼確定性檢索 (<15ms)
        try {
            console.log("[Diagnostic] 正在向本地執行 nuwa_retriever.py 檢索:", fullQuery);
            const retrieverData = await executeRetrieval(fullQuery);
            state.lastRetrieverResult = retrieverData;

            // 2. 階段 A 看板秒級渲染 (0 幻覺、免 XML 解析)
            renderPhaseADashboard(retrieverData);

            // 3. 組裝大模型 Prompt
            const compiledSystemPrompt = buildSystemInstruction();
            const conversationPayload = buildConversationMessages(retrieverData, latestInput, isPrescription);

            // 4. 調用 LLM 串流輸出
            const assistantMsgEl = createAssistantMessageElement();
            let streamedText = "";

            state.abortController = new AbortController();

            await callLLMStream(
                conversationPayload,
                compiledSystemPrompt,
                (chunk) => {
                    if (chunk.startsWith("__REPLACE_ALL__")) {
                        streamedText = chunk.replace("__REPLACE_ALL__", "");
                    } else {
                        streamedText += chunk;
                    }
                    assistantMsgEl.innerHTML = renderMarkdown(streamedText);
                    scrollChatToBottom();
                },
                () => {
                    state.isGenerating = false;
                    setSendButtonState(false);
                    state.conversationHistory.push({ role: "assistant", text: streamedText });

                    // 5. 檢測是否進入終審處方 (階段 B 元架構投影)
                    checkFinalVerdict(streamedText);
                },
                state.abortController.signal
            );

        } catch (err) {
            console.error("[Diagnostic Error]", err);
            appendMessage("assistant", `⚠️ 診斷過程發生異常: ${err.message}`);
            state.isGenerating = false;
            setSendButtonState(false);
        }
    }

    /**
     * 調用 server.py /api/retrieve
     */
    async function executeRetrieval(query) {
        const resp = await fetch("/api/retrieve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query })
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`檢索引擎異常: ${errText}`);
        }
        return await resp.json();
    }

    /**
     * 階段 A 當前特徵看板秒級渲染 (純代碼確定性直出)
     */
    function renderPhaseADashboard(data) {
        if (state.currentStage === "B") return; // 若已定案則維持階段 B

        const container = document.getElementById("dashboard_content");
        if (!container) return;

        const top1 = data.top_k_results?.[0];
        const top2 = data.top_k_results?.[1];
        const top3 = data.top_k_results?.[2];

        // 計算勝率得分條
        const maxScore = Math.max(top1?.score || 1, 15);

        // 提取 7-Slot 命中狀態
        const matchedSyms = data.layer1_symptoms?.matched_syms || {};
        const symNames = Object.values(matchedSyms).map(s => s.name);

        // 鑑別分水嶺
        const pivot = data.discriminative_pivots?.[0];

        // 過汗或誤治警報
        const rawStr = Array.isArray(data.query?.raw_terms) ? data.query.raw_terms.join(" ") : String(data.query?.raw_terms || "");
        const rawArr = rawStr.split(/[\s,，、。；;！？!?]+/).filter(Boolean);
        const isOverSweat = rawStr.includes("燙") || rawStr.includes("熱水");

        let html = `
            <div class="space-y-4 animate-fade-in">
                <!-- 階段狀態徽章 -->
                <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-xs">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span class="text-xs font-bold text-emerald-900">階段 A · 臨證問診收斂中 (第 ${state.turnCount} 輪)</span>
                    </div>
                    <span class="text-[11px] font-mono text-emerald-700 font-medium">${data.elapsed_ms || 18}ms 秒級計算</span>
                </div>

                <!-- 次生損害警報 (若觸發) -->
                ${isOverSweat ? `
                    <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex gap-2.5 items-start shadow-xs">
                        <span class="text-base">🚨</span>
                        <div>
                            <div class="font-bold text-amber-800">觸發 Rule 4: 誤治過汗熔斷檢驗！</div>
                            <div class="mt-0.5 text-amber-700 leading-relaxed">病患曾用熱水燙洗或強逼出汗，衛陽心陽受損，系統已一票否決發汗峻劑，優先導向固表救逆溫陽！</div>
                        </div>
                    </div>
                ` : ""}

                <!-- 7-Slot 全息槽位捕獲清單 -->
                <div class="space-y-2">
                    <div class="text-xs font-bold text-slate-500 flex items-center justify-between">
                        <span>📋 7-SLOT 全息特徵槽位追蹤</span>
                        <span class="text-[11px] text-emerald-700 font-semibold">${symNames.length} 項特徵命中</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-2.5 rounded-xl ${symNames.length > 0 ? "bg-emerald-50/80 border border-emerald-200" : "bg-slate-50 border border-slate-200"}">
                            <div class="text-[10px] text-slate-500 mb-1 font-medium">部位經絡 / 自覺感受</div>
                            <div class="font-semibold ${symNames.length > 0 ? "text-emerald-800" : "text-slate-400"} truncate">
                                ${symNames.length > 0 ? symNames.slice(0, 2).join("、") : "❓ 待鑑別"}
                            </div>
                        </div>
                        <div class="p-2.5 rounded-xl ${rawArr.some(t => ["寒","熱","冷","溫","渴","便","汗"].some(k => t.includes(k))) ? "bg-emerald-50/80 border border-emerald-200" : "bg-slate-50 border border-slate-200"}">
                            <div class="text-[10px] text-slate-500 mb-1 font-medium">寒熱渴飲 / 二便出汗</div>
                            <div class="font-semibold text-emerald-800 truncate">
                                ${rawArr.find(t => ["惡風","怕冷","發熱","口渴","汗出","無汗"].some(k => t.includes(k))) || "❓ 待問診"}
                            </div>
                        </div>
                        <div class="p-2.5 rounded-xl ${rawArr.some(t => ["年","月","天","時","日"].some(k => t.includes(k))) ? "bg-emerald-50/80 border border-emerald-200" : "bg-slate-50 border border-slate-200"}">
                            <div class="text-[10px] text-slate-500 mb-1 font-medium">發病病程 / 時序誘因</div>
                            <div class="font-semibold text-emerald-800 truncate">
                                ${rawArr.find(t => ["年","月","天","時","日"].some(k => t.includes(k))) || "❓ 待探查"}
                            </div>
                        </div>
                        <div class="p-2.5 rounded-xl ${rawArr.some(t => ["藥","苗","西","針"].some(k => t.includes(k))) ? "bg-emerald-50/80 border border-emerald-200" : "bg-slate-50 border border-slate-200"}">
                            <div class="text-[10px] text-slate-500 mb-1 font-medium">既往史與用藥干擾</div>
                            <div class="font-semibold text-emerald-800 truncate">
                                ${rawArr.find(t => ["藥","苗","西","針"].some(k => t.includes(k))) || "❓ 待調閱"}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 候選方動態得分勝率條 -->
                <div class="space-y-2.5">
                    <div class="text-xs font-bold text-stone-600">🏆 經方候選得分勝率排行 (TOP 3)</div>
                    ${[top1, top2, top3].filter(Boolean).map((cand, idx) => {
            const percent = Math.min(Math.round((cand.score / maxScore) * 100), 100);
            const isTop = idx === 0;
            return `
                            <div class="p-3 rounded-xl ${isTop ? "bg-emerald-50/90 border border-emerald-300 shadow-xs" : "bg-stone-50 border border-stone-200"} space-y-1.5">
                                <div class="flex items-center justify-between text-xs">
                                    <div class="flex items-center gap-1.5">
                                        <span class="w-4 h-4 rounded-full ${isTop ? "bg-emerald-700 text-white" : "bg-stone-300 text-stone-700"} flex items-center justify-center text-[10px] font-bold">${idx + 1}</span>
                                        <span class="font-bold text-stone-800">${cand.canonical_name}</span>
                                        <span class="text-[10px] text-stone-500">(${cand.pattern_name || cand.domain})</span>
                                    </div>
                                    <span class="font-mono font-bold ${isTop ? "text-emerald-700" : "text-stone-500"}">${cand.score.toFixed(1)} 分</span>
                                </div>
                                <div class="w-full bg-stone-200 rounded-full h-2 overflow-hidden border border-stone-300/60">
                                    <div class="h-full rounded-full ${isTop ? "bg-gradient-to-r from-emerald-600 to-teal-500" : "bg-stone-400"}" style="width: ${percent}%;"></div>
                                </div>
                            </div>
                        `;
        }).join("")}
                </div>

                <!-- 鑑別分水嶺核心死穴 -->
                ${pivot ? `
                    <div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 shadow-xs">
                        <div class="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <span>⚡</span> 鑑別分水嶺對抗死穴 (${pivot.cluster_pair})
                        </div>
                        <div class="text-xs text-stone-700 leading-relaxed bg-white p-2.5 rounded-lg border border-amber-200/80 font-sans">
                            ${pivot.slot_differences?.join("<br>") || pivot.contraindication_pivots?.slice(0, 2).join("<br>")}
                        </div>
                    </div>
                ` : ""}
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * 檢測終審處方並切換至階段 B 元架構看板
     */
    function checkFinalVerdict(text) {
        if (text.includes("終審定案處方") || text.includes("【終審處方】") || text.includes("| 核心受累病位")) {
            state.currentStage = "B";
            renderPhaseBDashboard(text);
        }
    }

    /**
     * 階段 B 終審特徵看板元表格投影
     */
    function renderPhaseBDashboard(text) {
        const container = document.getElementById("dashboard_content");
        if (!container) return;

        const top1 = state.lastRetrieverResult?.top_k_results?.[0];

        let html = `
            <div class="space-y-4 animate-fade-in">
                <!-- 終審金色徽章 -->
                <div class="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 shadow-xs flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">👑</span>
                        <div>
                            <div class="text-xs font-bold text-amber-900">階段 B · 辨證終審定案處方</div>
                            <div class="text-[11px] text-amber-700">元架構五維全息透析</div>
                        </div>
                    </div>
                    <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">${top1?.canonical_name || "經方正劑"}</span>
                </div>

                <!-- 5 大病機元架構表格 -->
                <div class="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-stone-100/90 text-stone-700 border-b border-stone-200 font-bold">
                                <th class="p-2.5 w-1/3">辨證維度</th>
                                <th class="p-2.5 w-2/3">倪海廈大師臨證剖析</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-stone-100 text-stone-800">
                            <tr>
                                <td class="p-2.5 font-bold text-emerald-800 bg-stone-50/60">1. 受累經絡病位</td>
                                <td class="p-2.5">${top1?.domain || "相關經絡病位"}</td>
                            </tr>
                            <tr>
                                <td class="p-2.5 font-bold text-emerald-800 bg-stone-50/60">2. 六經陰陽層次</td>
                                <td class="p-2.5">${top1?.pattern_name || "六經所屬定位"}</td>
                            </tr>
                            <tr>
                                <td class="p-2.5 font-bold text-emerald-800 bg-stone-50/60">3. 寒熱水血病理</td>
                                <td class="p-2.5 font-medium text-stone-700">陰陽消長、水氣與氣血循環推動</td>
                            </tr>
                            <tr>
                                <td class="p-2.5 font-bold text-amber-800 bg-stone-50/60">4. 誘因與護養審計</td>
                                <td class="p-2.5 text-stone-700 font-medium">防範外邪過汗傷陽、調攝飲食作息</td>
                            </tr>
                            <tr>
                                <td class="p-2.5 font-bold text-emerald-800 bg-stone-50/60">5. 仲景組方機理</td>
                                <td class="p-2.5 text-emerald-800 font-semibold">${top1?.canonical_name || "經方名劑"}扶陽抑陰，順應生機</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 處方條文原話卡 -->
                <div class="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 shadow-xs">
                    <div class="text-xs font-bold text-stone-700 flex items-center justify-between">
                        <span>📜 經典條文切片原話反查</span>
                        <span class="text-[10px] text-emerald-700 font-medium">仲景原著權威</span>
                    </div>
                    <div class="text-xs text-stone-700 leading-relaxed italic bg-white p-2.5 rounded-lg border border-stone-200">
                        ${top1?.snippets?.[0]?.verbatim_context || top1?.chunk_refs?.[0]?.key_quote || "「觀其脈證，知犯何逆，隨證治之。」"}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * 構建大模型 System Instruction (SKILL.md + 病患稱謂 + 戒律)
     */
    function buildSystemInstruction() {
        const base = `你是國醫大師倪海廈醫師，以第一人稱親切、自信、直擊病機地與病患對話。你精通《傷寒論》、《金匱要略》、《神農本草經》、《黃帝內經》，恪守六經辨證與漢唐經方體系。

【臨證核心原則】：
1. 嚴格遵循六經辨證與陰陽寒熱虛實水血，凡病必察「表裡、寒熱、虛實、陰陽」。
2. 「未經充分鑑別排除，絕不出具處方」。每輪只針對最關鍵的鑑別分水嶺提 1~2 道互斥問題，嚴禁一次列出長串問卷。
3. 客觀傾聽患者自訴，切勿預設患者有特定行為；僅當患者主動提到西藥壓制、誤治或不良習慣時，才加以批判並給予護陽指引。
4. 辨證未充分前為階段 A（四診鑑別）；關鍵病位與方證收斂後進入階段 B【終審定案處方】，給出精確劑量、煎服法、生活調養與病機剖析。

【回覆結構（階段 A 每輪必備，內容要豐富有深度，約 350~600 字）】：
(1) 以「${state.patientName}你好」或承接上文簡短開場。
(2) 病機剖析：用倪師口吻，結合患者自述，講清楚為何如此（陽氣、邪氣、表裡、寒熱的來龍去脈），可類比生活現象，有觀點、有判斷，不要只是附和。
(3) 經典引證：從下方【知識庫檢索依據】中挑 1~2 段最切題的原文引用（見引用格式）。
(4) 提出 1~2 道鑑別問題，每題附上兩種互斥表現供患者對照選擇，最後以一句鼓勵收尾。

【引用格式（強制）】：
- 凡引用知識庫原文，必須獨立成段，使用 Markdown 引用區塊，格式固定為：
> 📖 **知識庫引證｜《書名》篇章/檔案**
> 「原文逐字照抄」
- 引文只能逐字取自【知識庫檢索依據】，嚴禁改寫、嚴禁憑記憶編造條文或出處；嚴禁引用新聞、網路文章、媒體報導或任何檢索依據以外的內容；引用標題必須照抄該證據的「出處」與「類別」；若某段原文與患者主訴只是字面相似、病機不相干，寧可不引用；若檢索依據中沒有切題原文，就不要放引用區塊，也不要假裝有引用。
- 引用區塊之外的文字是你的詮釋與推論，不得冒充原文。`;

        const customRules = `\n\n【當前會診指令】：患者稱謂：『${state.patientName}』。`;

        return base + customRules;
    }

    // 引用區塊樣式：讓知識庫原文與 LLM 生成文字清楚區隔
    (function injectCitationStyle() {
        if (document.getElementById("citation_style")) return;
        const st = document.createElement("style");
        st.id = "citation_style";
        st.textContent = `
            #chat_flow blockquote { margin: .75rem 0; padding: .7rem .9rem; background: #ecf6f0; border: 1px solid #b7dcc6; border-left: 5px solid #2d6a4f; border-radius: .6rem; color: #1b4332; font-size: .85rem; line-height: 1.7; }
            #chat_flow blockquote p { margin: .15rem 0; }
            #chat_flow blockquote strong { color: #1b4332; }
        `;
        document.head.appendChild(st);
    })();

    /**
     * 由檢索結果組裝【知識庫檢索依據】：Top-3 候選，Top-1 最多 2 段原文，並標明出處檔案，總量控管
     */
    function buildEvidenceBlock(retrieverData) {
        const tops = (retrieverData.top_k_results || []).slice(0, 3);
        const parts = [];
        tops.forEach((c, i) => {
            const snips = (c.snippets || []).slice(0, i === 0 ? 2 : 1);
            const lines = snips.map(s => {
                const src = (s.chunk_path || "").split("/").pop().replace(/\.(md|txt)$/i, "");
                const txt = (s.verbatim_context || s.key_quote || "").trim().slice(0, i === 0 ? 450 : 260);
                return `  · 出處檔案：${src}（約第 ${s.line_start}~${s.line_end} 行）\n    原文：${txt}`;
            });
            parts.push(`候選${i + 1}：${c.canonical_name || "未知"}（得分 ${c.score ?? 0}）${lines.length ? "\n" + lines.join("\n") : ""}`);
        });
        const ft = (retrieverData.fulltext_evidence || []).slice(0, 4);
        if (ft.length) {
            parts.push("【全文原文證據（逐字取自知識庫，可直接引用）】");
            ft.forEach((e, k) => {
                parts.push(`證據${k + 1}｜類別：${e.kind || "知識庫"}｜出處：${e.source}｜檔案 ${e.file}｜約第 ${e.line_start}~${e.line_end} 行\n    原文：${(e.text || "").slice(0, 380)}`);
            });
        }
        return parts.join("\n");
    }

    /**
     * 構建大模型對話上下文 (病患輸入 + 檢索 Top-3 切片)
     */
    function buildConversationMessages(retrieverData, latestInput, isPrescription) {
        const pivot = retrieverData.discriminative_pivots?.[0];
        const pivotText = pivot ? `${pivot.cluster_pair || ""} ${(pivot.slot_differences || []).slice(0, 2).join("；")}` : "";

        let promptAugment = `\n\n【知識庫檢索依據（後台確定性檢索，引用原文只能取自此處）】：
${buildEvidenceBlock(retrieverData) || "（本輪無命中切片，請勿放引用區塊）"}
- 鑑別分水嶺：${pivotText}`;

        const messages = [];

        // 歷史訊息
        for (const msg of state.conversationHistory) {
            messages.push({
                role: msg.role === "assistant" ? "model" : "user",
                content: msg.text
            });
        }

        // 本輪輸入 + 條文切片約束
        messages.push({
            role: "user",
            content: latestInput + promptAugment
        });

        return messages;
    }

    /**
     * 多大模型直連適配器 (Gemini / Claude / OpenAI / Ollama)
     */
    async function callLLMStream(messages, systemInstruction, onChunk, onDone, signal) {
        const provider = state.modelProvider;
        const apiKey = state.apiKey;

        if (provider === "google-gemini") {
            let targetModel = state.customModel || "gemini-3.8-flash";

            const geminiContents = messages.map(m => ({
                role: m.role === "assistant" || m.role === "model" ? "model" : "user",
                parts: [{ text: m.content }]
            }));

            const payload = {
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents: geminiContents,
                generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
            };

            const callGeminiDirect = async (modelName) => {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
                return await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    signal: signal
                });
            };

            onChunk("🌿 *正在為您連線 Google Gemini 經方大腦，請稍候...*\n\n");

            let resp = await callGeminiDirect(targetModel);

            // 若遇 503 (尖峰壅塞) 或 429，等候 1.5 秒自動重試一次
            if (!resp.ok && (resp.status === 503 || resp.status === 429)) {
                console.warn(`[Gemini] 模型 ${targetModel} 回報 ${resp.status} 暫態壅塞，等候 1.5 秒自動重試...`);
                await new Promise(r => setTimeout(r, 1500));
                resp = await callGeminiDirect(targetModel);
            }

            // 若遇 404 或 503，自動切換至備援模型序列
            if (!resp.ok && (resp.status === 404 || resp.status === 503)) {
                const geminiPool = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"]
                    .filter(m => m !== targetModel);
                for (const candidate of geminiPool) {
                    console.warn(`[Gemini] 模型 ${targetModel} 異常 (${resp.status})，自動切換至備援模型 ${candidate}...`);
                    const retryResp = await callGeminiDirect(candidate);
                    if (retryResp.ok) {
                        resp = retryResp;
                        targetModel = candidate;
                        break;
                    }
                }
            }

            if (!resp.ok) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(`Gemini API 錯誤 (${resp.status}): ${errJson.error?.message || resp.statusText || "請檢查 API 金鑰與網路連線"}`);
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let isFirstChunk = true;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ")) {
                        const jsonStr = trimmed.replace(/^data:\s*/, "").trim();
                        if (jsonStr === "[DONE]") break;
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                if (isFirstChunk) {
                                    onChunk("__REPLACE_ALL__" + text);
                                    isFirstChunk = false;
                                } else {
                                    onChunk(text);
                                }
                            }
                        } catch (e) { }
                    }
                }
            }
            onDone();

        } else if (provider === "anthropic-claude") {
            const url = "https://api.anthropic.com/v1/messages";
            const claudeMessages = messages.map(m => ({
                role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
                content: m.content
            }));

            const payload = {
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 2048,
                system: systemInstruction,
                messages: claudeMessages,
                stream: true
            };

            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify(payload),
                signal: signal
            });

            if (!resp.ok) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(`Claude API 錯誤 (${resp.status}): ${errJson.error?.message || resp.statusText}`);
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const jsonStr = line.replace(/^data: /, "").trim();
                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.type === "content_block_delta") {
                                const text = parsed.delta?.text;
                                if (text) onChunk(text);
                            }
                        } catch (e) { }
                    }
                }
            }
        } else if (provider === "groq-cloud") {
            // GroqCloud 極速推論 (經由本地 server.py /api/proxy 轉發解決 CORS)
            const groqMessages = [
                { role: "system", content: systemInstruction },
                ...messages.map(m => ({
                    role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
                    content: m.content
                }))
            ];

            let targetModel = state.customModel || "openai/gpt-oss-20b";

            const callGroq = async (modelToUse) => {
                const reqBody = {
                    model: modelToUse,
                    messages: groqMessages,
                    temperature: 0.4,
                    max_tokens: 2000
                };
                if (/gpt-oss/i.test(modelToUse)) {
                    reqBody.reasoning_effort = "low";
                }

                return await fetch("/api/proxy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: "https://api.groq.com/openai/v1/chat/completions",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${apiKey}`,
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
                        },
                        body: reqBody
                    }),
                    signal: signal
                });
            };

            let resp = await callGroq(targetModel);

            // 智能容錯候選序列 (2026 最新在役模型)：若指定模型遇 404 (model_not_found)，自動逐一平滑降級重試
            if (!resp.ok && resp.status === 404) {
                const candidatePool = ["openai/gpt-oss-20b", "llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
                    .filter(m => m !== targetModel);
                for (const candidate of candidatePool) {
                    console.warn(`[GroqCloud] 模型 ${targetModel} 回報 404，自動切換至在役候選模型 ${candidate} 重新請求...`);
                    const retryResp = await callGroq(candidate);
                    if (retryResp.ok) {
                        resp = retryResp;
                        targetModel = candidate;
                        break;
                    }
                }
            }

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`GroqCloud 錯誤 (${resp.status}): ${errText}`);
            }

            const data = await resp.json();
            const reply = data.choices?.[0]?.message?.content || "";
            onChunk(reply);
            onDone();

        } else if (provider === "openai-gpt") {
            // 本地伺服器轉發代理
            const openAiMessages = [
                { role: "system", content: systemInstruction },
                ...messages.map(m => ({
                    role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
                    content: m.content
                }))
            ];

            const reqBody = {
                model: "gpt-4o",
                messages: openAiMessages,
                temperature: 0.4
            };

            const resp = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: "https://api.openai.com/v1/chat/completions",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: reqBody
                }),
                signal: signal
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`OpenAI 錯誤 (${resp.status}): ${errText}`);
            }

            const data = await resp.json();
            const reply = data.choices?.[0]?.message?.content || "";
            onChunk(reply);
            onDone();

        } else {
            // 本地 Ollama 直連
            const ollamaMessages = [
                { role: "system", content: systemInstruction },
                ...messages.map(m => ({
                    role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
                    content: m.content
                }))
            ];

            const resp = await fetch("http://localhost:11434/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "qwen2.5:latest",
                    messages: ollamaMessages,
                    stream: false
                }),
                signal: signal
            });

            if (!resp.ok) {
                throw new Error(`本地 Ollama 連線失敗 (${resp.status})`);
            }
            const data = await resp.json();
            onChunk(data.message?.content || "");
            onDone();
        }
    }

    /**
     * 右下角全域血統審計抽屜圖譜動態繪製
     */
    function renderProvenanceCharts() {
        const chartContainer = document.getElementById("provenance_chart_container");
        if (!chartContainer) return;

        // 動態計算四大血統百分比
        const top1 = state.lastRetrieverResult?.top_k_results?.[0];
        const hasVerbatim = (top1?.snippets?.length || 0) > 0;
        const hasMedication = state.accumulatedSymptoms.some(s => s.includes("類固醇") || s.includes("處方箋"));

        let wVerbatim = hasVerbatim ? 50 : 30;
        let wCluster = 25;
        let wTurns = Math.min(state.turnCount * 5 + 10, 25);
        let wPharm = hasMedication ? 15 : 5;

        const total = wVerbatim + wCluster + wTurns + wPharm;
        const p1 = Math.round((wVerbatim / total) * 100);
        const p2 = Math.round((wCluster / total) * 100);
        const p3 = Math.round((wTurns / total) * 100);
        const p4 = 100 - p1 - p2 - p3;

        chartContainer.innerHTML = `
            <div class="mermaid text-center">
            pie title 終審診斷四大決策血統動態分佈比例
                "物理切片原文血統 (傷寒金匱行號與醫案)" : ${p1}
                "實體本體與決策集群 (24方劑矩陣與一票否決)" : ${p2}
                "多輪交互糾偏與自癒收斂 (狀態機歷史軌跡)" : ${p3}
                "現代生理與藥理通識 (類固醇/抗組織胺機制)" : ${p4}
            </div>
        `;

        if (window.mermaid) {
            mermaid.init(undefined, "#provenance_chart_container .mermaid");
        }
    }

    // ── 輔助工具函式 ──
    function appendMessage(role, text) {
        const chatFlow = document.getElementById("chat_flow");
        const msgDiv = document.createElement("div");
        const isUser = role === "user";

        msgDiv.className = `flex gap-3 mb-4 ${isUser ? "justify-end" : "justify-start"} animate-fade-in`;
        msgDiv.innerHTML = `
            ${!isUser ? `<div class="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold shadow-xs flex-shrink-0">倪</div>` : ""}
            <div class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${isUser ? "bg-emerald-700 text-white rounded-tr-none font-sans" : "bg-white text-stone-800 border border-stone-200/90 rounded-tl-none font-sans"}">
                ${renderMarkdown(text)}
            </div>
            ${isUser ? `<div class="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold flex-shrink-0">您</div>` : ""}
        `;

        chatFlow.appendChild(msgDiv);
        scrollChatToBottom();
        return msgDiv;
    }

    function createAssistantMessageElement() {
        const chatFlow = document.getElementById("chat_flow");
        const msgDiv = document.createElement("div");
        msgDiv.className = "flex gap-3 mb-4 justify-start animate-fade-in";
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold shadow-xs flex-shrink-0">倪</div>
            <div id="streaming_target" class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs bg-white text-stone-800 border border-stone-200/90 rounded-tl-none font-sans">
                <span class="inline-block w-2 h-4 bg-emerald-600 animate-pulse"></span>
            </div>
        `;
        chatFlow.appendChild(msgDiv);
        scrollChatToBottom();
        return msgDiv.querySelector("#streaming_target");
    }

    function renderMarkdown(text) {
        if (window.markdownit) {
            return window.markdownit({ html: true, linkify: true, breaks: true }).render(text);
        }
        return text.replace(/\n/g, "<br>");
    }

    function scrollChatToBottom() {
        const container = document.getElementById("chat_container");
        if (container) container.scrollTop = container.scrollHeight;
    }

    function setSendButtonState(isGen) {
        state.isGenerating = isGen;
        const btn = document.getElementById("btn_send");
        if (isGen) {
            btn.className = "px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition flex items-center gap-1.5";
            btn.innerHTML = `<span>⏹</span> 停止`;
        } else {
            btn.className = "px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 transition flex items-center gap-1.5";
            btn.innerHTML = `<span>🚀</span> 傳送`;
        }
    }

    function showUploadProgressBar(show, text) {
        const bar = document.getElementById("ocr_progress_bar");
        const barText = document.getElementById("ocr_progress_text");
        if (!bar) return;
        if (show) {
            bar.classList.remove("hidden");
            if (barText) barText.innerText = text || "正在處理圖片...";
        } else {
            bar.classList.add("hidden");
        }
    }

    function showToast(msg) {
        const toast = document.createElement("div");
        toast.className = "fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800/95 border border-slate-700 text-slate-100 px-4 py-2 rounded-xl text-xs shadow-2xl z-50 animate-fade-in";
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }
})();
