/**
 * tcm_widgets.js - 《岐黃智鑑》UI/UX 精華整合模組（純前端擴充，嚴格物理隔離，不污染 SKILL 核心庫）
 * 包含三大視覺互動組件：
 * 1. 八綱六經與心陽動態徽章列 (Eight-Principle & Six-Meridian Dynamic Badges)
 * 2. 視覺化舌象圖鑑快選器 + 8 大脈象 Canvas 動態波形模擬器 (Visual Tongue & Pulse Selector Modal)
 * 3. 宣紙竹簡古風「四柱經方養生與處方箋」列印卡 (Classical Prescription Print Card)
 */

(function () {
    const TONGUE_CARDS = [
        {
            id: "pale_teeth",
            title: "淡白胖嫩齒痕舌",
            tag: "脾腎陽虛 · 寒水泛濫",
            insertText: "【舌象自察：舌色淡白、舌體胖大邊緣有明顯齒痕、舌面水滑白潤】",
            bgGradient: "radial-gradient(circle at 50% 35%, #f3d5d8, #dfb4b9 70%, #c8969c)",
            coatColor: "rgba(255,255,255,0.55)",
            desc: "常見於心陽不足、小腸火衰或水飲停聚（五苓散、真武湯、理中湯、桂枝麻黃各半湯表水證）。"
        },
        {
            id: "red_thin",
            title: "淡紅薄白潤舌",
            tag: "胃氣尚存 · 表證或初病",
            insertText: "【舌象自察：舌質淡紅適中、薄白苔潤澤】",
            bgGradient: "radial-gradient(circle at 50% 35%, #e88d96, #d46570 70%, #b54854)",
            coatColor: "rgba(255,255,255,0.38)",
            desc: "病在太陽表層或輕淺階段，胃中津液未傷。"
        },
        {
            id: "crimson_peel",
            title: "紅絳少苔或裂紋舌",
            tag: "陰虛火旺 · 津液枯竭",
            insertText: "【舌象自察：舌質鮮紅或深紅絳、少苔乾燥有裂紋】",
            bgGradient: "radial-gradient(circle at 50% 35%, #d93848, #b31b2c 70%, #800f1b)",
            coatColor: "rgba(255,235,230,0.15)",
            desc: "常見於少陰心煩不得臥（黃連阿膠湯）、虛勞煩熱（酸棗仁湯）或誤汗亡津液。"
        },
        {
            id: "yellow_greasy",
            title: "黃厚膩苔或燥黃舌",
            tag: "濕熱內蘊 · 陽明腑實",
            insertText: "【舌象自察：舌紅、舌苔黃厚黏膩或乾燥偏黃】",
            bgGradient: "radial-gradient(circle at 50% 35%, #e0636e, #c43c49 70%, #9c2430)",
            coatColor: "rgba(230, 195, 95, 0.72)",
            desc: "常見於濕熱在表裡（麻黃連軺赤小豆湯、茵陳蒿湯）或中焦寒熱錯雜（半夏瀉心湯）。"
        },
        {
            id: "purple_stasis",
            title: "紫暗瘀點瘀斑舌",
            tag: "寒凝血瘀 · 胞宮陰實",
            insertText: "【舌象自察：舌色紫暗或舌邊尖有明顯黑紫色瘀點】",
            bgGradient: "radial-gradient(circle at 50% 35%, #b56b88, #8c4260 70%, #61223c)",
            coatColor: "rgba(240,230,245,0.28)",
            desc: "常見於少腹宿有癥病瘀血（桂枝茯苓丸、溫經湯、桃核承氣湯、抵當湯）。"
        }
    ];

    const PULSE_TYPES = [
        { id: "fu_jin", name: "浮緊脈", freq: 1.3, amp: 28, sharp: 1.4, baseline: -10, desc: "輕按即得、如按繃緊繩索（太陽傷寒無汗、表寒束表）", insertText: "【脈象體感：脈浮而緊，按之有力，伴隨怕冷無汗】" },
        { id: "fu_huan", name: "浮緩脈", freq: 1.0, amp: 22, sharp: 0.9, baseline: -8, desc: "浮取明顯而來去怠緩（太陽中風汗出惡風、桂枝湯證）", insertText: "【脈象體感：脈浮而緩，伴隨容易流汗怕風】" },
        { id: "xian_xi", name: "弦細脈", freq: 1.15, amp: 18, sharp: 1.6, baseline: 0, desc: "端直以長如按琴弦（少陽柴胡證、肝鬱水飲、厥陰烏梅丸證）", insertText: "【脈象體感：脈弦細如琴弦】" },
        { id: "chen_xi_wei", name: "沉微細脈", freq: 0.8, amp: 10, sharp: 0.7, baseline: 12, desc: "重按至骨方得、細小微弱（少陰陽虛四逆湯、真武湯證）", insertText: "【脈象體感：脈沉細微弱，重按才摸得到，手腳冰冷】" },
        { id: "hong_da", name: "洪大滑數脈", freq: 1.6, amp: 34, sharp: 1.2, baseline: -6, desc: "脈來如波濤洶湧、跳動極快（陽明大熱白虎湯、濕熱實證）", insertText: "【脈象體感：脈象洪大跳動快而有力，身體燥熱口渴】" },
        { id: "jie_dai", name: "結代促脈", freq: 1.1, amp: 20, sharp: 1.1, baseline: 2, irregular: true, desc: "脈來時有一止、跳跳停停（心陽虛胸痺、炙甘草湯證）", insertText: "【脈象體感：脈搏跳動偶有停頓不規律（心律不整/早搏感）】" }
    ];

    let activePulse = PULSE_TYPES[0];
    let animFrameId = null;

    function injectTopControlsAndModals() {
        // 1. 在輸入框工具列加入「👅 舌脈快選」與「📜 處方箋列印」按鈕
        const uploadBtn = document.getElementById("btn_upload_prescription");
        if (uploadBtn && !document.getElementById("btn_tongue_pulse")) {
            const tpBtn = document.createElement("button");
            tpBtn.id = "btn_tongue_pulse";
            tpBtn.type = "button";
            tpBtn.className = "p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs transition flex items-center gap-1.5 flex-shrink-0";
            tpBtn.title = "打開《岐黃智鑑》視覺化舌象圖鑑與脈象模擬器，一鍵帶入四診描述";
            tpBtn.innerHTML = `<span class="text-base">👅</span><span class="hidden sm:inline">舌脈</span>`;
            tpBtn.onclick = openTonguePulseModal;
            uploadBtn.parentNode.insertBefore(tpBtn, uploadBtn.nextSibling);
        }

        // 2. 在右側儀表板標題列下方插入「八綱六經動態徽章列」容器
        const dashCol = document.getElementById("dashboard_column");
        const dashContent = document.getElementById("dashboard_content");
        if (dashCol && dashContent && !document.getElementById("eight_principle_bar")) {
            const bar = document.createElement("div");
            bar.id = "eight_principle_bar";
            bar.className = "px-3.5 py-2.5 bg-gradient-to-r from-stone-50 via-emerald-50/40 to-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-1.5 text-[11px] flex-shrink-0";
            bar.innerHTML = renderEightPrincipleBadgesHTML(null);
            dashCol.insertBefore(bar, dashContent);
        }

        // 3. 建立舌脈圖鑑彈窗與古風處方箋列印彈窗
        if (!document.getElementById("modal_tongue_pulse")) {
            const modal = document.createElement("div");
            modal.id = "modal_tongue_pulse";
            modal.className = "fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 hidden";
            modal.innerHTML = buildTonguePulseModalHTML();
            document.body.appendChild(modal);
            bindTonguePulseEvents();
        }

        if (!document.getElementById("modal_print_prescription")) {
            const pModal = document.createElement("div");
            pModal.id = "modal_print_prescription";
            pModal.className = "fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 hidden";
            pModal.innerHTML = buildPrintModalShellHTML();
            document.body.appendChild(pModal);
        }
    }

    function renderEightPrincipleBadgesHTML(retrieverData, rawQueryStr = "") {
        if (!retrieverData) {
            return `
                <div class="flex items-center gap-1.5 flex-wrap w-full justify-between">
                    <span class="font-bold text-stone-500">☯️ 八綱六經定位：</span>
                    <div class="flex items-center gap-1 flex-wrap">
                        <span class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 border border-stone-200 font-mono">六經: 待辨</span>
                        <span class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 border border-stone-200 font-mono">表裡: 待辨</span>
                        <span class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 border border-stone-200 font-mono">寒熱: 待辨</span>
                        <span class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 border border-stone-200 font-mono">手足心陽: 待驗</span>
                    </div>
                </div>
            `;
        }

        const top1 = retrieverData.top_k_results?.[0];
        const hub1 = retrieverData.star_hubs_matched?.[0];
        const syms = Object.keys(retrieverData.layer1_symptoms?.matched_syms || {});
        const q = rawQueryStr + " " + (top1?.domain || "") + " " + (top1?.pattern_name || "") + " " + (hub1?.specialty || "");

        // 推算六經與專科
        let meridian = "太陽/雜病";
        for (const m of ["太陽", "陽明", "少陽", "太陰", "少陰", "厥陰", "婦人", "歷節", "痰飲", "胸痺"]) {
            if (q.includes(m)) { meridian = m; break; }
        }

        // 推算表裡
        let exterior = "半表半裡/雜病";
        if (q.includes("表") || q.includes("皮") || q.includes("汗") || meridian === "太陽") exterior = "表證/湊理";
        if (q.includes("裡") || q.includes("腹") || q.includes("便") || q.includes("胞宮") || ["太陰", "少陰", "厥陰", "陽明"].includes(meridian)) {
            exterior = q.includes("表") ? "表裡同病" : "裡證/臟腑";
        }

        // 推算寒熱
        const hasCold = q.includes("寒") || q.includes("冷") || q.includes("冰") || syms.some(s => s.includes("COLD"));
        const hasHeat = q.includes("熱") || q.includes("燙") || q.includes("癢") || q.includes("渴") || syms.some(s => s.includes("HEAT") || s.includes("FEVER"));
        let coldHeat = "平/待辨";
        let chColor = "bg-stone-100 text-stone-700 border-stone-200";
        if (hasCold && hasHeat) {
            coldHeat = "寒熱錯雜/外寒內熱";
            chColor = "bg-purple-50 text-purple-800 border-purple-200 font-bold";
        } else if (hasCold) {
            coldHeat = "虛寒/寒濕";
            chColor = "bg-sky-50 text-sky-800 border-sky-200 font-bold";
        } else if (hasHeat) {
            coldHeat = "鬱熱/實熱";
            chColor = "bg-rose-50 text-rose-800 border-rose-200 font-bold";
        }

        // 手足心陽
        let yangStatus = "手足待問";
        let yangColor = "bg-amber-50 text-amber-800 border-amber-200";
        if (rawQueryStr.includes("手腳冰冷") || rawQueryStr.includes("雙腳冰冷") || syms.some(s => s.includes("COLD_LIMBS"))) {
            yangStatus = "❄️ 心陽下達不足(手足冷)";
            yangColor = "bg-sky-100 text-sky-900 border-sky-300 font-bold";
        } else if (rawQueryStr.includes("手腳溫") || rawQueryStr.includes("手足溫")) {
            yangStatus = "🔥 心陽固密(手足溫)";
            yangColor = "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
        }

        return `
            <div class="flex items-center justify-between gap-1.5 flex-wrap w-full">
                <div class="flex items-center gap-1 flex-wrap">
                    <span class="px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-900 border border-emerald-300 font-bold">${meridian}</span>
                    <span class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-300 font-semibold">${exterior}</span>
                    <span class="px-2 py-0.5 rounded-md border ${chColor}">${coldHeat}</span>
                    <span class="px-2 py-0.5 rounded-md border ${yangColor}">${yangStatus}</span>
                </div>
                <button type="button" onclick="window.NiHaiShaWidgets.openPrintCard()" class="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold transition flex items-center gap-1 shadow-2xs" title="預覽並匯出古風經方衛教處方箋">
                    <span>📜</span> 處方箋
                </button>
            </div>
        `;
    }

    function buildTonguePulseModalHTML() {
        const cardsHtml = TONGUE_CARDS.map(c => `
            <div data-tongue-id="${c.id}" class="tongue-card cursor-pointer p-3 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition flex flex-col justify-between gap-2 bg-white shadow-2xs">
                <div class="flex items-center gap-3">
                    <!-- CSS 擬真舌象示意圖 -->
                    <div class="w-12 h-14 rounded-t-xl rounded-b-[26px] relative flex-shrink-0 shadow-inner border border-stone-300/60 overflow-hidden" style="background: ${c.bgGradient};">
                        <div class="absolute inset-x-1.5 top-1.5 bottom-3 rounded-b-[20px] blur-[1px]" style="background: ${c.coatColor};"></div>
                        <div class="absolute inset-y-2 left-1/2 -translate-x-1/2 w-[1px] bg-black/15"></div>
                    </div>
                    <div>
                        <div class="font-bold text-stone-800 text-xs">${c.title}</div>
                        <div class="text-[10px] font-semibold text-emerald-700 mt-0.5">${c.tag}</div>
                        <div class="text-[11px] text-stone-500 mt-1 leading-snug">${c.desc}</div>
                    </div>
                </div>
                <div class="text-right">
                    <span class="inline-block px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold">＋ 點擊帶入問診框</span>
                </div>
            </div>
        `).join("");

        const pulseButtonsHtml = PULSE_TYPES.map((p, idx) => `
            <button type="button" data-pulse-id="${p.id}" class="pulse-btn px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${idx === 0 ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"}">
                ${p.name}
            </button>
        `).join("");

        return `
            <div class="bg-white border border-stone-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                <div class="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">👅</span>
                        <h3 class="text-sm sm:text-base font-bold text-stone-800">《岐黃智鑑》視覺化舌象圖鑑與脈波動態模擬器</h3>
                    </div>
                    <button type="button" id="close_tongue_pulse" class="text-stone-400 hover:text-stone-700 text-xl px-2 py-0.5 rounded-lg hover:bg-stone-200">✕</button>
                </div>
                <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                    <div>
                        <div class="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
                            <span>1. 望舌自察圖鑑（請對照鏡子點擊最接近的舌象，自動帶入對話框）：</span>
                            <span class="text-[11px] text-emerald-700">支援多選補充</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            ${cardsHtml}
                        </div>
                    </div>

                    <div class="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                        <div class="flex items-center justify-between flex-wrap gap-2">
                            <span class="text-xs font-bold text-stone-700">2. 切脈波型模擬器（點擊切換脈象並觀察寸關尺波型）：</span>
                            <button type="button" id="btn_insert_pulse" class="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-2xs transition">
                                ＋ 將當前脈象帶入問診框
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            ${pulseButtonsHtml}
                        </div>
                        <div class="bg-[#0f1f18] rounded-xl p-3 border border-emerald-900/60 relative">
                            <canvas id="pulse_wave_canvas" width="620" height="110" class="w-full h-[96px] block"></canvas>
                            <div id="pulse_desc_banner" class="text-[11px] text-emerald-300 font-mono mt-1.5">${PULSE_TYPES[0].desc}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function buildPrintModalShellHTML() {
        return `
            <div class="bg-[#faf6ee] border-2 border-[#c8b89a] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                <div class="p-3.5 border-b border-[#dccbb1] flex items-center justify-between bg-[#f2eadb]">
                    <div class="flex items-center gap-2">
                        <span class="text-base">📜</span>
                        <h3 class="text-sm font-bold text-stone-800 tracking-wider">漢唐經方臨證四柱辨證與衛教處方箋</h3>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" id="btn_do_print" class="px-3 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition">🖨️ 列印 / 存為 PDF</button>
                        <button type="button" onclick="document.getElementById('modal_print_prescription').classList.add('hidden')" class="text-stone-500 hover:text-stone-800 text-lg px-2">✕</button>
                    </div>
                </div>
                <div id="print_card_body" class="flex-1 overflow-y-auto p-6 space-y-4 text-stone-800 font-serif"></div>
            </div>
        `;
    }

    function bindTonguePulseEvents() {
        const modal = document.getElementById("modal_tongue_pulse");
        const closeBtn = document.getElementById("close_tongue_pulse");
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.add("hidden");
                stopPulseAnimation();
            };
        }

        modal.querySelectorAll(".tongue-card").forEach(card => {
            card.onclick = () => {
                const tid = card.getAttribute("data-tongue-id");
                const found = TONGUE_CARDS.find(c => c.id === tid);
                if (found) {
                    insertToUserInput(found.insertText);
                    modal.classList.add("hidden");
                    stopPulseAnimation();
                }
            };
        });

        modal.querySelectorAll(".pulse-btn").forEach(btn => {
            btn.onclick = () => {
                const pid = btn.getAttribute("data-pulse-id");
                const found = PULSE_TYPES.find(p => p.id === pid);
                if (!found) return;
                activePulse = found;
                modal.querySelectorAll(".pulse-btn").forEach(b => {
                    b.className = "pulse-btn px-2.5 py-1.5 rounded-lg border text-xs font-bold transition bg-white text-stone-700 border-stone-300 hover:bg-stone-100";
                });
                btn.className = "pulse-btn px-2.5 py-1.5 rounded-lg border text-xs font-bold transition bg-emerald-700 text-white border-emerald-700";
                const banner = document.getElementById("pulse_desc_banner");
                if (banner) banner.textContent = found.desc;
            };
        });

        const insertPulseBtn = document.getElementById("btn_insert_pulse");
        if (insertPulseBtn) {
            insertPulseBtn.onclick = () => {
                insertToUserInput(activePulse.insertText);
                modal.classList.add("hidden");
                stopPulseAnimation();
            };
        }

        const printBtn = document.getElementById("btn_do_print");
        if (printBtn) {
            printBtn.onclick = () => window.print();
        }
    }

    function insertToUserInput(snippet) {
        const inputEl = document.getElementById("user_input");
        if (!inputEl) return;
        const cur = inputEl.value.trim();
        inputEl.value = cur ? `${cur} ${snippet}` : snippet;
        inputEl.dispatchEvent(new Event("input"));
        inputEl.focus();
    }

    function openTonguePulseModal() {
        const modal = document.getElementById("modal_tongue_pulse");
        if (!modal) return;
        modal.classList.remove("hidden");
        startPulseAnimation();
    }

    function startPulseAnimation() {
        stopPulseAnimation();
        const canvas = document.getElementById("pulse_wave_canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let phase = 0;

        function draw() {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // 背景格線
            ctx.strokeStyle = "rgba(52, 211, 153, 0.12)";
            ctx.lineWidth = 1;
            for (let y = 20; y < h; y += 25) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            // 脈波曲線
            ctx.strokeStyle = "#34d399";
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            const midY = h / 2 + (activePulse.baseline || 0);
            for (let x = 0; x < w; x++) {
                const t = (x * 0.045 * activePulse.freq) - phase;
                const cycle = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                let val = 0;
                if (activePulse.irregular && Math.floor((x + phase * 18) / 140) % 4 === 2) {
                    val = 0;
                } else {
                    const mainPeak = Math.exp(-Math.pow((cycle - 1.2) * activePulse.sharp, 2)) * activePulse.amp;
                    const dicrotic = Math.exp(-Math.pow((cycle - 2.3) * 1.8, 2)) * (activePulse.amp * 0.38);
                    val = mainPeak + dicrotic;
                }
                const y = midY - val;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            phase += 0.09;
            animFrameId = requestAnimationFrame(draw);
        }
        draw();
    }

    function stopPulseAnimation() {
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
    }

    function openPrintCard() {
        const modal = document.getElementById("modal_print_prescription");
        const body = document.getElementById("print_card_body");
        if (!modal || !body) return;

        const patient = document.getElementById("current_patient_badge")?.innerText || "問診病患";
        const lastData = window.__nihaishaLastRetrieverData || null;
        const top1 = lastData?.top_k_results?.[0];
        const hub1 = lastData?.star_hubs_matched?.[0];
        const dateStr = new Date().toLocaleDateString("zh-TW");

        body.innerHTML = `
            <div class="border-2 border-[#8c6d46] p-5 rounded-xl bg-[#fffdf8] space-y-4 shadow-inner">
                <div class="flex items-center justify-between border-b-2 border-[#8c6d46] pb-3">
                    <div>
                        <div class="text-lg font-extrabold text-[#5c3a21] tracking-widest">漢唐經方 · 臨證四柱辨證衛教箋</div>
                        <div class="text-xs text-stone-600 mt-0.5">病患稱謂：<strong>${patient}</strong> ｜ 日期：${dateStr}</div>
                    </div>
                    <div class="w-11 h-11 rounded-lg border-2 border-red-800 text-red-800 flex items-center justify-center font-extrabold text-xs leading-tight text-center p-0.5">
                        經方<br>審計
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="p-3 rounded-lg bg-[#f7f1e3] border border-[#dccbb1]">
                        <div class="font-bold text-[#5c3a21] mb-1">【第一柱 · 病機樞紐與六經定位】</div>
                        <div class="text-stone-700 leading-relaxed">${hub1?.hub_name || top1?.pattern_name || "依六經八綱與心陽水火模型動態推演中"}</div>
                    </div>
                    <div class="p-3 rounded-lg bg-[#f7f1e3] border border-[#dccbb1]">
                        <div class="font-bold text-[#5c3a21] mb-1">【第二柱 · 仲景代表經方候選】</div>
                        <div class="text-emerald-900 font-bold text-sm">${top1?.canonical_name || (hub1?.primary_formulas || []).slice(0, 2).join(" / ") || "待完成五軸問診收斂"}</div>
                        <div class="text-[11px] text-stone-600 mt-0.5">專科歸屬：${hub1?.specialty || top1?.domain || "經方內科"}</div>
                    </div>
                </div>

                <div class="p-3 rounded-lg bg-[#f7f1e3] border border-[#dccbb1] text-xs space-y-1">
                    <div class="font-bold text-[#5c3a21]">【第三柱 · 倪師病機總綱與經典引證】</div>
                    <div class="text-stone-700 leading-relaxed">${hub1?.pathogenesis_core || top1?.snippets?.[0]?.key_quote || "「觀其脈證，知犯何逆，隨證治之。」"}</div>
                </div>

                <div class="p-3 rounded-lg bg-[#f7f1e3] border border-[#dccbb1] text-xs space-y-1">
                    <div class="font-bold text-[#5c3a21]">【第四柱 · 漢唐養生調攝與健康六大驗收標準】</div>
                    <ul class="list-disc list-inside text-stone-700 space-y-1 leading-relaxed">
                        <li><strong>嚴禁冰冷與人工甜食</strong>：寒涼飲品與精緻糖直接澆滅小腸相火、助長痰飲與胃酸逆流。</li>
                        <li><strong>給邪出路，勿閉門留寇</strong>：表水風疹當取微汗透發，切忌濫用類固醇壓制或熱水過燙傷及表陽。</li>
                        <li><strong>健康六大黃金指標驗收</strong>：一覺到天亮、胃口自然知飢、每日晨起成形便、小便淡黃5~7次、渴飲溫水、四季手心腳底溫熱。</li>
                    </ul>
                </div>

                <div class="text-[10px] text-rose-800 border-t border-[#dccbb1] pt-2 text-center">
                    ⚠️ 聲明：本衛教箋由 NiHaiSha v4.0 全域星狀知識圖譜生成，僅供經方學術研究與醫病溝通參考，實際處方劑量須由合格中醫師親診把脈核定。
                </div>
            </div>
        `;
        modal.classList.remove("hidden");
    }

    function updateBadges(retrieverData, rawQueryStr) {
        window.__nihaishaLastRetrieverData = retrieverData;
        const bar = document.getElementById("eight_principle_bar");
        if (bar) {
            bar.innerHTML = renderEightPrincipleBadgesHTML(retrieverData, rawQueryStr || "");
        }
    }

    window.NiHaiShaWidgets = {
        updateBadges,
        openTonguePulseModal,
        openPrintCard
    };

    document.addEventListener("DOMContentLoaded", injectTopControlsAndModals);
})();
