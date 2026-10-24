/**
 * static_backend.js - GitHub Pages 靜態託管模式的檢索後端 (Pyodide 橋接)
 * 職責：
 * 1. 在無 server.py 的環境 (GitHub Pages) 攔截 POST /api/retrieve，
 *    改由瀏覽器內 Pyodide 直接執行「原封不動」的 scripts/nuwa_retriever.py。
 * 2. 僅掛載 data/00_全域方證與條文速查地圖/*.json 與其引用的切片檔 (約 1MB)，不下載全部 20MB 切片庫。
 * 3. 本機 (localhost / 127.0.0.1) 仍走 server.py 原生 Python，本檔不介入。
 * 嚴格物理隔離於 js/，不修改 scripts/ 與 00_~11_ 任何內容。
 * 已知差異：靜態模式無 fulltext_evidence 全文檢索補充 (需 server.py)，/api/proxy 亦不可用。
 */
(function () {
    const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
    const MAP_DIR = "data/00_全域方證與條文速查地圖";
    const MAP_FILES = ["lexicon_symptoms.json", "thesaurus_layman_to_tcm.json", "global_tcm_graph.json", "master_index.json"];

    const host = location.hostname;
    const forceStatic = new URLSearchParams(location.search).get("static") === "1";
    const isNative = !forceStatic && (host === "localhost" || host === "127.0.0.1" || host === "");
    if (isNative) return;

    const nativeFetch = window.fetch.bind(window);
    let enginePromise = null;

    const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

    function loadScript(src) {
        return new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = src; s.onload = res; s.onerror = () => rej(new Error("無法載入 " + src));
            document.head.appendChild(s);
        });
    }

    function banner(msg) {
        let el = document.getElementById("static_backend_banner");
        if (!el) {
            el = document.createElement("div");
            el.id = "static_backend_banner";
            el.className = "fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-sky-950/95 border border-sky-700 text-sky-200 text-xs px-4 py-2 rounded-xl shadow-2xl";
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.display = msg ? "block" : "none";
    }

    async function getText(path) {
        const r = await nativeFetch(enc(path));
        if (!r.ok) throw new Error("讀取失敗 " + path + " (" + r.status + ")");
        return await r.text();
    }

    async function initEngine() {
        banner("⏳ 首次載入瀏覽器內 Python 檢索引擎 (約 10MB，僅此一次)...");
        await loadScript(PYODIDE_URL);
        const py = await window.loadPyodide();

        const mk = (d) => { try { py.FS.mkdirTree(d); } catch (e) { } };
        mk("/nuwa/scripts"); mk("/nuwa/data"); mk("/nuwa/" + MAP_DIR);

        const writeFile = (rel, text) => {
            const dir = rel.substring(0, rel.lastIndexOf("/"));
            if (dir) mk("/nuwa/" + dir);
            py.FS.writeFile("/nuwa/" + rel, text, { encoding: "utf8" });
        };

        writeFile("scripts/nuwa_retriever.py", await getText("scripts/nuwa_retriever.py"));

        const refs = new Set();
        for (const f of MAP_FILES) {
            const rel = MAP_DIR + "/" + f;
            let txt;
            try { txt = await getText(rel); } catch (e) { continue; }
            writeFile(rel, txt);
            if (f !== "global_tcm_graph.json") { for (const m of txt.matchAll(/"(?:chunk_path|file_path)"\s*:\s*"([^"]+)"/g)) refs.add(m[1]); }
        }
        await Promise.all([...refs].map(async (rel) => {
            try { writeFile(rel, await getText(rel)); } catch (e) { console.warn("[static] 略過切片", rel); }
        }));

        py.runPython(`
import sys, io, importlib.util
for _n in ("stdout", "stdin"):
    _s = getattr(sys, _n)
    if (getattr(_s, "encoding", "") or "").lower().replace("-", "") != "utf8":
        setattr(sys, _n, io.TextIOWrapper(io.BytesIO(), encoding="utf-8"))
_spec = importlib.util.spec_from_file_location("nuwa_retriever", "/nuwa/scripts/nuwa_retriever.py")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
_retriever = _mod.NuwaRetriever()
`);
        banner("");
        return py;
    }

    async function retrieve(query) {
        if (!enginePromise) enginePromise = initEngine().catch((e) => { enginePromise = null; banner(""); throw e; });
        const py = await enginePromise;
        py.globals.set("_q", query);
        const out = py.runPython(`
import json
json.dumps(_retriever.query(_q, ""), ensure_ascii=False)
`);
        const data = JSON.parse(out);
        data.fulltext_evidence = [];
        return data;
    }

    window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        if (/\/api\/retrieve$/.test(url.split("?")[0])) {
            try {
                const body = JSON.parse((init && init.body) || "{}");
                const data = await retrieve((body.query || "").trim());
                return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 500 });
            }
        }
        return nativeFetch(input, init);
    };

    console.log("[static_backend] 靜態託管模式啟用：/api/retrieve 由 Pyodide 執行 nuwa_retriever.py");
})();
