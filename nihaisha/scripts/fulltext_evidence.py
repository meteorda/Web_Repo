# -*- coding: utf-8 -*-
"""
fulltext_evidence.py — 全文原文檢索補位模組（不修改 nuwa_retriever.py）

用途：症狀詞典 (lexicon_symptoms.json) 未涵蓋的主訴（如皮膚癢、疹、疫苗後反應等）
      會導致檢索 0 命中、LLM 無原文可引。本模組直接對 179 個切片做段落級 n-gram 檢索，
      回傳「逐字原文 + 書名/篇章/檔案/行號」，供前端放入【知識庫檢索依據】並強制引用。

設計：
  - 切片內文為簡體，查詢先經擴充繁轉簡再比對。
  - 以 2~3 字 n-gram 計分，稀有 n-gram 權重高（類 IDF），過常見者剔除。
  - 依書籍優先級加權（傷寒/金匱/醫案優先於針灸/天紀）。
  - 純本地、零外部相依；索引首次呼叫時建立並常駐記憶體。
"""
import os
import re
import math
import threading

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_EXTRA_T2S = {}
for _pair in (
    "癢痒 疹疹 膚肤 類类 兩两 變变 嚴严 眠眠 紅红 燙烫 涼凉 體体 觸触 夠够 還还 時时 後后 養养 觀观 應应 現现 "
    "開开 麼么 點点 這这 個个 沒没 會会 對对 問问 腸肠 腦脑 臟脏 腎肾 鬱郁 瘡疮 鹽盐 臉脸 嚨咙 暈晕 噁恶 愛爱 "
    "麵面 飯饭 餓饿 數数 長长 間间 門门 場场 異异 條条 號号 為为 於于 與与 從从 勞劳 勢势 勝胜 協协 單单 卻却 "
    "壓压 縮缩 總总 線线 練练 組组 絕绝 給给 續续 維维 緊紧 緩缓 繼继 習习 聽听 臥卧 舊旧 興兴 華华 蟲虫 補补 "
    "裝装 見见 規规 視视 計计 訴诉 診诊 話话 該该 說说 請请 讓让 貴贵 費费 資资 軟软 輕轻 輸输 轉转 辦办 達达 "
    "遲迟 選选 針针 鑑鉴 閉闭 隨随 雜杂 離离 難难 靜静 頁页 順顺 須须 預预 頻频 顏颜 顯显 飽饱 驗验 魚鱼 齒齿 "
    "湯汤 經经 脈脉 證证 發发 熱热 惡恶 頭头 頸颈 項项 強强 無无 氣气 煩烦 飲饮 瀉泻 結结 裏里 裡里 嘔呕 陰阴 "
    "陽阳 虛虚 實实 溫温 攣挛 動动 驚惊 語语 關关 節节 腫肿 脫脱 風风 濕湿 痺痹 歷历 黃黄 連连 膠胶 澤泽 棗枣 "
    "細细 乾干 薑姜 歸归 藥药 龍龙 調调 傷伤 寒寒 論论 醫医 病病 學学 處处 劑剂 殺杀 毒毒 滯滞 勞劳 瘀瘀 疫疫 "
    "苗苗 醇醇 殘残 癒愈 療疗 癰痈 瘍疡 瘧疟 癬癣 瘙瘙 麻麻 疙疙 瘩瘩 蕁荨 癮瘾 腫肿 潰溃 膿脓 痘痘 痤痤 瘡疮"
).split():
    if len(_pair) == 2:
        _EXTRA_T2S[_pair[0]] = _pair[1]


def to_simplified(text: str) -> str:
    return "".join(_EXTRA_T2S.get(c, c) for c in text)


# 書籍優先級（目錄前綴 → 權重）
_BOOK_WEIGHT = {
    "02_": 2.00, "01_": 2.00, "07_": 1.90, "11_": 1.85, "06_": 1.80,
    "04_": 1.30, "03_": 1.30, "05_": 1.10, "09_": 0.25, "10_": 0.20, "08_": 0.15,
}
_STOP_CHARS = set("我你他她它的了是很有在也就都而及與与和或但被把讓让給给請请嗎吗呢吧啊哦呀這这那一個个會会可以不沒没怎麼么什麼為为何")
_PUNCT = re.compile(r"[\s,，。、；;：:！!？?（）()\[\]【】「」『』\"'“”‘’\-—…/\\|]+")

_NUM_PREFIX = re.compile(r"^[0-9]+_")
# 新聞剪報、網址、媒體稿特徵：這類內容不是倪師言論，禁止當作「知識庫引證」
_NEWS_PAT = re.compile(r"中央社|记者|記者|更新日期|日电|日電|新闻|新聞|报道|報導|版权|版權|https?://|www\.|联合报|聯合報|自由时报|自由時報|中时|蘋果日報|苹果日报|医院.{0,12}医师.{0,6}表示|研究显示|研究顯示|专家指出|專家指出|编辑|編輯|转载|轉載|来源[:：]|資料來源|资料来源|\u2009")
_lock = threading.Lock()
_index = None  # list of dict(path, source, book, chapter, line_start, line_end, text, weight)


def _parse_front_matter(raw: str):
    book = chapter = ""
    if raw.startswith("---"):
        end = raw.find("\n---", 3)
        if end != -1:
            fm = raw[3:end]
            m = re.search(r"^book:\s*(.+)$", fm, re.M)
            if m:
                book = m.group(1).strip()
            m = re.search(r"^chapter:\s*(.+)$", fm, re.M)
            if m:
                chapter = m.group(1).strip()
    return book, chapter


def _build_index():
    windows = []
    for root, _dirs, files in os.walk(BASE_DIR):
        rel_root = os.path.relpath(root, BASE_DIR).replace("\\", "/")
        if "chunks" not in rel_root.split("/"):
            continue
        parts = [p for p in rel_root.split("/") if p != "data"]
        top = parts[0] if parts else ""
        weight = next((w for k, w in _BOOK_WEIGHT.items() if top.startswith(k)), 1.0)
        for fn in files:
            if not fn.lower().endswith(".md"):
                continue
            if fn.startswith("06_倪海廈事實評論") or fn.startswith("07_西醫藥事實評論") or top.startswith("08_") or top.startswith("09_"):
                continue
            path = os.path.join(root, fn)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    raw = f.read()
            except Exception:
                continue
            book, chapter = _parse_front_matter(raw)
            lines = raw.splitlines()
            # 略過 front-matter
            start = 0
            if lines and lines[0].strip() == "---":
                for i in range(1, min(len(lines), 40)):
                    if lines[i].strip() == "---":
                        start = i + 1
                        break
            i = start
            n = len(lines)
            while i < n:
                j = i
                buf = []
                size = 0
                while j < n and size < 170 and len(buf) < 7:
                    s = lines[j].strip()
                    if s and not s.startswith("#"):
                        buf.append(s)
                        size += len(s)
                    j += 1
                text = " ".join(buf).strip()
                if book:
                    src_label = f"《{book}》" + (f"·{chapter}" if chapter else "")
                else:
                    src_label = "《" + _NUM_PREFIX.sub("", top) + "》·" + os.path.splitext(fn)[0]
                if _NEWS_PAT.search(text):
                    i = max(i + 3, j - 2) if j > i else i + 1
                    continue
                if len(text) >= 40:
                    windows.append({
                        "path": rel_root + "/" + fn,
                        "source": src_label,
                        "file": fn,
                        "line_start": i + 1,
                        "line_end": j,
                        "text": text,
                        "weight": weight,
                    })
                i = max(i + 3, j - 2) if j > i else i + 1
    return windows


def _get_index():
    global _index
    if _index is None:
        with _lock:
            if _index is None:
                _index = _build_index()
    return _index


def _ngrams(query_s: str):
    grams = set()
    for seg in _PUNCT.split(query_s):
        seg = "".join(c for c in seg if c not in _STOP_CHARS or False)
        seg = seg.strip()
        for n in (2, 3):
            for k in range(len(seg) - n + 1):
                g = seg[k:k + n]
                if len(g.strip()) == n:
                    grams.add(g)
    return grams


def search(query: str, top_n: int = 4, max_chars: int = 420):
    """回傳 [{source, path, line_start, line_end, text, score}]"""
    if not query or not query.strip():
        return []
    idx = _get_index()
    if not idx:
        return []
    q = to_simplified(query)
    grams = _ngrams(q)
    if not grams:
        return []

    total = len(idx)
    texts = [w["text"] for w in idx]
    gram_w = {}
    for g in grams:
        df = sum(1 for t in texts if g in t)
        if df == 0 or df > total * 0.08:
            continue
        gram_w[g] = (math.log(total / df)) * (1.0 if len(g) == 2 else 1.6)
    if not gram_w:
        return []

    scored = []
    for w in idx:
        t = w["text"]
        s = 0.0
        hit = 0
        for g, gw in gram_w.items():
            if g in t:
                s += gw
                hit += 1
        if hit >= 2:
            scored.append((s * w["weight"], w))
    scored.sort(key=lambda x: -x[0])

    results = []
    used = set()
    for s, w in scored:
        key = (w["path"], w["line_start"] // 12)  # 避免同一檔案相鄰重複
        if key in used:
            continue
        used.add(key)
        results.append({
            "source": w["source"],
            "path": w["path"],
            "file": w["file"],
            "line_start": w["line_start"],
            "line_end": w["line_end"],
            "text": w["text"][:max_chars],
            "kind": ("倪師講記" if w["path"][:3] in ("01_","02_","03_","04_") else ("倪師心法" if w["path"][:3] in ("06_","09_","10_") else "漢唐臨床醫案紀錄")),
            "score": round(s, 2),
        })
        if len(results) >= top_n:
            break
    return results


if __name__ == "__main__":
    import sys, json, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    q = " ".join(sys.argv[1:]) or "皮膚癢 吹風更癢 疫苗 類固醇"
    print(json.dumps(search(q), ensure_ascii=False, indent=2))
