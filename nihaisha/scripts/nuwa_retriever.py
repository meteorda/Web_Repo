# -*- coding: utf-8 -*-
"""
nuwa_retriever.py - 經方高精全息七星解耦本體與全域星狀病機圖譜檢索引擎 (v4.0 Pure Python, Zero Dependency)
實現：
1. 雙軌容錯聯集檢索 (Raw Track + Corrected Track)
2. 前後向滑動否定視窗 (4-char forward / 3-char backward) 與簡繁全自動對齊
3. Layer 2 七星方證矩陣對數飽和計分 (Log-saturation) 與禁忌一票否決 (Negative Veto)
4. Layer 3 全域星狀病機樞紐路由 (Star-Graph Pathogenesis Hubs) 與《漢唐經典配方》232 條臨床專病映射
5. Tier 1/2/3 部類權重分級（臨床問診自動屏蔽 Tier 3 社會新聞與評論雜訊）
"""

import os
import sys
import json
import re
import math
import io
import time

# Force UTF-8 on Windows console
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stdin.encoding != 'utf-8':
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 核心常用中醫簡繁轉換映射（純本地、零相依）
T2S_MAP = {
    '湯': '汤', '經': '经', '脈': '脉', '證': '证', '發': '发', '熱': '热',
    '惡': '恶', '頭': '头', '頸': '颈', '項': '项', '強': '强', '幾': '几',
    '無': '无', '汗': '汗', '氣': '气', '喘': '喘', '煩': '烦', '躁': '躁',
    '渴': '渴', '飲': '饮', '瀉': '泻', '結': '结', '裏': '里', '裡': '里',
    '嘔': '呕', '噦': '哕', '逆': '逆', '陰': '阴', '陽': '阳', '虛': '虚',
    '實': '实', '寒': '寒', '溫': '温', '痛': '痛', '攣': '挛', '急': '急',
    '動': '动', '悸': '悸', '驚': '惊', '譫': '谵', '語': '语', '關': '关',
    '節': '节', '腫': '肿', '脫': '脱', '風': '风', '濕': '湿', '痺': '痹',
    '暍': '暍', '歷': '历', '黃': '黄', '連': '连', '膠': '胶', '梔': '栀',
    '豉': '豉', '術': '朮', '澤': '泽', '薤': '薤', '白': '白',
    '栝': '栝', '蔞': '蒌', '瓜': '瓜', '棗': '枣', '細': '细', '辛': '辛',
    '乾': '干', '薑': '姜', '歸': '归', '芍': '芍', '藥': '药', '石': '石',
    '覆': '覆', '赭': '赭', '半': '半', '夏': '夏', '苓': '苓', '桂': '桂',
    '枝': '枝', '麻': '麻', '柴': '柴', '胡': '胡', '葛': '葛', '根': '根',
    '虎': '虎', '龍': '龙', '承': '承', '胃': '胃', '調': '调', '理': '理',
    '中': '中', '四': '四', '通': '通', '真': '真', '武': '武', '酸': '酸',
    '癢': '痒', '蕁': '荨', '瘡': '疮', '癬': '癣', '婦': '妇', '產': '产',
    '帶': '带', '癥': '癥', '瘕': '瘕', '瘤': '瘤', '癌': '癌', '腫': '肿',
    '暈': '晕', '眩': '眩', '鳴': '鸣', '頻': '频', '閉': '闭', '軺': '轺',
    '翹': '翘', '鬱': '郁', '脹': '胀', '滿': '满', '嘔': '呕', '酸': '酸'
}
S2T_MAP = {v: k for k, v in T2S_MAP.items() if k != '裡' and k != '瓜'}
S2T_MAP['里'] = '裡'
S2T_MAP['干'] = '乾'
S2T_MAP['姜'] = '薑'
S2T_MAP['朮'] = '術'
S2T_MAP['发'] = '發'
S2T_MAP['后'] = '後'
S2T_MAP['痒'] = '癢'
S2T_MAP['荨'] = '蕁'

def to_simplified(text: str) -> str:
    return ''.join(T2S_MAP.get(c, c) for c in text)

def to_traditional(text: str) -> str:
    return ''.join(S2T_MAP.get(c, c) for c in text)

class NuwaRetriever:
    def __init__(self, base_dir: str = BASE_DIR):
        self.base_dir = base_dir
        self.lexicon_path = self._resolve_map_file(base_dir, "lexicon_symptoms.json")
        self.thesaurus_path = self._resolve_map_file(base_dir, "thesaurus_layman_to_tcm.json")
        self.graph_path = self._resolve_map_file(base_dir, "global_tcm_graph.json")
        
        self.lexicon = self._load_json(self.lexicon_path)
        self.thesaurus = self._load_json(self.thesaurus_path)
        self.global_graph = self._load_json(self.graph_path, required=False) or {}
        
        self.symptoms = self.lexicon.get("symptoms", [])
        self.clusters = self.thesaurus.get("clusters", [])
        self.star_hubs = self.global_graph.get("star_pathogenesis_hubs", [])
        self.hantang_indications = self.global_graph.get("hantang_indications", [])
        
        # 否定關鍵詞表
        self.negation_words = ["不", "沒", "无", "無", "未", "非", "別", "莫", "忌", "没有", "不曾", "未见", "流不出"]

    def _resolve_map_file(self, base_dir: str, filename: str) -> str:
        candidates = [
            os.path.join(base_dir, "data", "00_全域方證與條文速查地圖", filename),
            os.path.join(base_dir, "00_全域方證與條文速查地圖", filename),
            os.path.join(base_dir, filename)
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        return candidates[0]

    def _load_json(self, path: str, required: bool = True):
        if not os.path.exists(path):
            if required:
                raise FileNotFoundError(f"Missing required knowledge file: {path}")
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def detect_negation(self, query: str, match_start: int, match_end: int) -> bool:
        """
        雙向滑動否定視窗：
        前向 3 字元 (Prefix Window)：例如「沒有流汗」、「完全不冷」、「身無汗」
        排除跨越分隔符號（空白、逗點、頓號）以及「不除」、「不止」、「不退」、「不解」等持續態副詞。
        """
        prefix_start = max(0, match_start - 3)
        prefix = query[prefix_start:match_start]
        
        delimiters = [' ', '，', '、', ',', ';', '；', '\t', '。', '！', '？']
        last_delim_idx = -1
        for d in delimiters:
            pos = prefix.rfind(d)
            if pos > last_delim_idx:
                last_delim_idx = pos
        if last_delim_idx != -1:
            prefix = prefix[last_delim_idx + 1:]
            
        for nw in self.negation_words:
            if nw in prefix:
                full_prefix = query[max(0, match_start - 4):match_start]
                if any(kw in full_prefix for kw in ("不除", "不止", "不退", "不解", "不休", "不已")):
                    continue
                return True
                
        if match_end < len(query):
            next_char = query[match_end]
            next_two = query[match_end:min(len(query), match_end + 2)]
            if next_char == "否":
                return True
            if next_char == "不" and next_two not in ("不除", "不止", "不退", "不解", "不休", "不已"):
                return True

        return False

    def extract_symptoms(self, raw_query: str, corrected_query: str = "") -> dict:
        """
        雙軌容錯聯集抽取 (Layer 1):
        同時在 raw_query 與 corrected_query 中比對症狀，支援簡繁混雜與否定倒置。
        """
        queries = [raw_query]
        if corrected_query and corrected_query != raw_query:
            queries.append(corrected_query)
            
        matched_syms = {}
        negated_syms = set()
        
        for q in queries:
            q_trad = to_traditional(q)
            q_simp = to_simplified(q)
            
            for sym in self.symptoms:
                sym_id = sym["sym_id"]
                legacy_id = sym.get("legacy_id")
                canonical_name = sym["canonical_name"]
                synonyms = sym.get("synonyms", [])
                antonym_id = sym.get("negation_antonym")
                weight = sym.get("default_weight", 1.0)
                
                all_aliases = set([canonical_name] + synonyms)
                all_aliases.update([to_traditional(a) for a in all_aliases])
                all_aliases.update([to_simplified(a) for a in all_aliases])
                
                for alias in all_aliases:
                    if not alias or len(alias) < 2:
                        continue
                    for target_text in (q, q_trad, q_simp):
                        start_idx = 0
                        while True:
                            idx = target_text.find(alias, start_idx)
                            if idx == -1:
                                break
                            match_start = idx
                            match_end = idx + len(alias)
                            
                            is_neg = self.detect_negation(target_text, match_start, match_end)
                            if is_neg:
                                negated_syms.add(sym_id)
                                if legacy_id:
                                    negated_syms.add(legacy_id)
                                if antonym_id:
                                    ant_obj = next((s for s in self.symptoms if s["sym_id"] == antonym_id or s.get("legacy_id") == antonym_id), None)
                                    ant_legacy = ant_obj.get("legacy_id") if ant_obj else None
                                    matched_syms[antonym_id] = {
                                        "name": f"非_{alias} -> {antonym_id}",
                                        "weight": weight * 1.2,
                                        "is_negated": False,
                                        "legacy_id": ant_legacy
                                    }
                                    if ant_legacy and ant_legacy != antonym_id:
                                        matched_syms[ant_legacy] = {
                                            "name": f"非_{alias} -> {antonym_id}",
                                            "weight": weight * 1.2,
                                            "is_negated": False,
                                            "primary_id": antonym_id
                                        }
                            else:
                                if sym_id not in matched_syms:
                                    matched_syms[sym_id] = {
                                        "name": canonical_name,
                                        "weight": weight,
                                        "is_negated": False,
                                        "legacy_id": legacy_id
                                    }
                                    if legacy_id and legacy_id != sym_id:
                                        matched_syms[legacy_id] = {
                                            "name": canonical_name,
                                            "weight": weight,
                                            "is_negated": False,
                                            "primary_id": sym_id
                                        }
                            start_idx = match_end

        for neg_id in list(negated_syms):
            if neg_id in matched_syms:
                del matched_syms[neg_id]
                
        return {
            "matched_syms": matched_syms,
            "negated_syms": list(negated_syms)
        }

    def score_clusters(self, symptom_analysis: dict, raw_query: str = "", normalized_query: str = "") -> list:
        r"""
        七星解耦矩陣對數飽和計分 (Layer 2):
        S(C_k) = \sum w_s * ln(1 + slot_score) + layman_direct_bonus + paradox_bonus - veto
        """
        matched = symptom_analysis["matched_syms"]
        combined_q = f"{raw_query} {normalized_query}"
        combined_q_trad = to_traditional(combined_q)
        combined_q_simp = to_simplified(combined_q)
        results = []
        
        for cluster in self.clusters:
            cid = cluster["cluster_id"]
            cname = cluster["canonical_name"]
            pname = cluster.get("pattern_name", "")
            domain = cluster.get("domain", "")
            contraindicated = cluster.get("contraindicated_symptoms", [])
            paradox_rules = cluster.get("paradox_override_rules", [])
            slots = cluster.get("slots", {})
            
            # 1. 禁忌一票否決 (Negative Veto)
            veto_triggered = False
            for bad_sym in contraindicated:
                if bad_sym in matched:
                    veto_triggered = True
                    break
                    
            if veto_triggered:
                continue
                
            # 2. 槽位對齊與對數飽和評分
            score = 0.0
            matched_details = []
            
            cluster_text_bag = []
            for slot_key, slot_values in slots.items():
                cluster_text_bag.extend(slot_values)
            cluster_text_joined = " ".join(cluster_text_bag)
            
            for sym_id, info in matched.items():
                if info.get("primary_id"):
                    continue
                sym_weight = info["weight"]
                sym_obj = next((s for s in self.symptoms if s["sym_id"] == sym_id or s.get("legacy_id") == sym_id), None)
                aliases = set([info["name"]])
                if sym_obj:
                    aliases.update(sym_obj.get("synonyms", []))
                    aliases.add(sym_obj.get("canonical_name", ""))
                
                slot_hits = 0
                for a in aliases:
                    if len(a) >= 2 and (a in cluster_text_joined or to_simplified(a) in cluster_text_joined or to_traditional(a) in cluster_text_joined):
                        slot_hits += 1
                        
                if slot_hits > 0:
                    slot_score = sym_weight * (1.0 + math.log(1 + slot_hits))
                    score += slot_score
                    matched_details.append(f"{sym_id}(hits={slot_hits}, +{slot_score:.2f})")
            
            # 2b. 直接比對 cluster 內 layman_modern_terms 與 subjective_sensation（補強長句口語命中）
            direct_terms = slots.get("layman_modern_terms", []) + slots.get("subjective_sensation", [])
            direct_hits = 0
            for dt in direct_terms:
                if len(dt) >= 2 and (dt in combined_q or dt in combined_q_trad or dt in combined_q_simp):
                    direct_hits += 1
            if direct_hits > 0:
                direct_bonus = 2.2 * math.log(1 + direct_hits)
                score += direct_bonus
                matched_details.append(f"DIRECT_SLOT(hits={direct_hits}, +{direct_bonus:.2f})")
                
            # 3. 矛盾外推特例規則 (Paradox Override Rules)
            for rule in paradox_rules:
                action = rule.get("action")
                penalty = rule.get("penalty_score", 0.0)
                if action == "OVERRIDE_PRIORITIZE":
                    has_deep_cold = any(k in matched for k in ("SYM_COLD_LIMBS", "SYM_070_COLD_LIMBS_JUE", "SYM_DIARRHEA_COLD", "SYM_053_DIARRHEA_WATERY"))
                    has_false_heat = any(k in matched for k in ("SYM_FEVER_HEAT", "SYM_003_FEVER_HEAT", "SYM_004_FEVER_HIGH"))
                    if has_deep_cold and has_false_heat:
                        score += penalty
                        matched_details.append(f"觸發真寒假熱優先權(+{penalty})")
                    
            if score > 0.5:
                results.append({
                    "cluster_id": cid,
                    "canonical_name": cname,
                    "pattern_name": pname,
                    "domain": domain,
                    "score": round(score, 2),
                    "matched_details": matched_details,
                    "chunk_refs": cluster.get("chunk_refs", [])
                })
                
        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    def match_star_hubs(self, raw_query: str, normalized_query: str = "") -> list:
        """
        Layer 3: 全域星狀病機樞紐路由 (Star-Graph Pathogenesis Hub Routing)
        將患者口語主訴映射至 8 大臨床專科病機樞紐，返回病機總綱、鑑別樞紐追問軸與已預先驗真之經典/醫案原文錨點。
        """
        if not self.star_hubs:
            return []
        combined = f"{raw_query} {normalized_query}"
        combined_trad = to_traditional(combined)
        combined_simp = to_simplified(combined)
        
        matched_hubs = []
        for hub in self.star_hubs:
            triggers = hub.get("colloquial_triggers", [])
            hit_triggers = []
            for trig in triggers:
                t_trad = to_traditional(trig)
                t_simp = to_simplified(trig)
                if trig in combined or t_trad in combined_trad or t_simp in combined_simp:
                    hit_triggers.append(trig)
            if hit_triggers:
                hub_score = round(3.0 * (1.0 + math.log(len(hit_triggers))), 2)
                matched_hubs.append({
                    "hub_id": hub["hub_id"],
                    "specialty": hub["specialty"],
                    "hub_name": hub["hub_name"],
                    "score": hub_score,
                    "matched_triggers": hit_triggers,
                    "pathogenesis_core": hub["pathogenesis_core"],
                    "primary_formulas": hub["primary_formulas"],
                    "discriminative_axes": hub.get("discriminative_axes", []),
                    "verified_snippets": hub.get("verified_snippets", [])
                })
        matched_hubs.sort(key=lambda x: x["score"], reverse=True)
        return matched_hubs[:2]

    def match_hantang_indications(self, raw_query: str, normalized_query: str = "", top_n: int = 3) -> list:
        """
        比對《漢唐經典配方全集》232 條臨床專病主治索引
        """
        if not self.hantang_indications:
            return []
        combined = f"{raw_query} {normalized_query}"
        combined_trad = to_traditional(combined)
        combined_simp = to_simplified(combined)
        
        # 抽取查詢中的 2~4 字實詞進行快速交集計分
        clean_q = re.sub(r'[^\u4e00-\u9fff]', ' ', combined_trad)
        tokens = set()
        for seg in clean_q.split():
            if len(seg) >= 2:
                for L in (4, 3, 2):
                    for i in range(len(seg) - L + 1):
                        sub = seg[i:i+L]
                        if sub not in ("請問", "什麼", "怎麼", "可以", "已經", "一直", "感覺", "時候", "比較", "一點", "醫生", "醫師"):
                            tokens.add(sub)
        if not tokens:
            return []
            
        scored = []
        for item in self.hantang_indications:
            title_t = item.get("title", "")
            snip_t = to_traditional(item.get("snippet", ""))
            hit_score = 0.0
            hit_words = []
            for tk in tokens:
                if tk in title_t:
                    hit_score += len(tk) * 2.5
                    hit_words.append(tk)
                elif tk in snip_t:
                    hit_score += len(tk) * 0.6
            if hit_score >= 4.0:
                scored.append({
                    "title": item["title"],
                    "chunk_path": item["chunk_path"],
                    "line_start": item["line_start"],
                    "line_end": item["line_end"],
                    "score": round(hit_score, 2),
                    "snippet": item["snippet"]
                })
        scored.sort(key=lambda x: x["score"], reverse=True)
        # 去重相同處方標題
        seen_titles = set()
        unique_matches = []
        for s in scored:
            if s["title"] not in seen_titles:
                seen_titles.add(s["title"])
                unique_matches.append(s)
            if len(unique_matches) >= top_n:
                break
        return unique_matches

    def extract_context_snippets(self, cluster_result: dict, lines_radius: int = 8) -> list:
        """
        從真實切片檔案中提取確定性原文脈絡 (±lines_radius 行)，精準控制回傳字元防止 Token 洩漏
        支援物理檔案讀取與預存 key_quote 回退（相容於無實體 Markdown 之瀏覽器 Pyodide 環境）
        """
        snippets = []
        for ref in cluster_result.get("chunk_refs", []):
            rel_path = ref.get("chunk_path") or ref.get("file_path", "")
            anchor = ref.get("anchor_snippet") or ref.get("verbatim_anchor", "")
            key_quote = ref.get("key_quote", "")
            
            full_path = os.path.join(self.base_dir, rel_path.replace('/', os.sep))
            context_text = ""
            target_line_idx = ref.get("line_start", 1)
            
            if os.path.exists(full_path):
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        file_text = f.read()
                    norm_file = re.sub(r'\s+', ' ', file_text)
                    norm_anchor = re.sub(r'\s+', ' ', anchor).strip()
                    idx = norm_file.find(norm_anchor)
                    if idx == -1:
                        idx = norm_file.find(norm_anchor[:12])
                    if idx != -1:
                        orig_idx = file_text.find(norm_anchor[:10])
                        if orig_idx != -1:
                            lines_before = file_text[:orig_idx].splitlines()
                            target_line_idx = len(lines_before)
                            all_lines = file_text.splitlines()
                            start_l = max(0, target_line_idx - lines_radius)
                            end_l = min(len(all_lines), target_line_idx + lines_radius + 1)
                            context_text = "\n".join(all_lines[start_l:end_l]).strip()
                except Exception:
                    pass
                    
            if not context_text:
                context_text = f"{anchor}\n{key_quote}".strip()
                
            snippets.append({
                "chunk_path": rel_path,
                "anchor_snippet": anchor,
                "line_start": max(1, target_line_idx - lines_radius),
                "line_end": target_line_idx + lines_radius,
                "key_quote": key_quote,
                "verbatim_context": context_text
            })
        return snippets

    def query(self, raw_terms: str, normalized_terms: str = "", top_k: int = 3) -> dict:
        t0 = time.perf_counter()
        
        # 1. Layer 1 症狀提取與雙向否定過濾
        sym_res = self.extract_symptoms(raw_terms, normalized_terms)
        
        # 2. Layer 2 矩陣打分與一票否決
        cluster_scores = self.score_clusters(sym_res, raw_terms, normalized_terms)
        
        # 3. 提取 Top-K 脈絡切片
        top_clusters = cluster_scores[:top_k]
        for c in top_clusters:
            c["snippets"] = self.extract_context_snippets(c)
            
        # 4. Layer 3 全域星狀病機樞紐路由與《漢唐經典配方》專病匹配
        star_hubs_matched = self.match_star_hubs(raw_terms, normalized_terms)
        hantang_matches = self.match_hantang_indications(raw_terms, normalized_terms, top_n=3)
            
        # 5. 生成臨床鑑別分水嶺 (Discriminative Pivots)
        discriminative_pivots = []
        if len(top_clusters) >= 2:
            c1 = top_clusters[0]
            c2 = top_clusters[1]
            c1_obj = next((c for c in self.clusters if c["cluster_id"] == c1["cluster_id"]), None)
            c2_obj = next((c for c in self.clusters if c["cluster_id"] == c2["cluster_id"]), None)
            if c1_obj and c2_obj:
                c1_contra = set(c1_obj.get("contraindicated_symptoms", []))
                c2_contra = set(c2_obj.get("contraindicated_symptoms", []))
                contra_pivots = []
                for s in c1_contra:
                    sym_name = next((sym["canonical_name"] for sym in self.symptoms if sym["sym_id"] == s or sym.get("legacy_id") == s), s)
                    contra_pivots.append(f"{c1['canonical_name']}排斥/禁忌「{sym_name}」")
                for s in c2_contra:
                    sym_name = next((sym["canonical_name"] for sym in self.symptoms if sym["sym_id"] == s or sym.get("legacy_id") == s), s)
                    contra_pivots.append(f"{c2['canonical_name']}排斥/禁忌「{sym_name}」")
                
                slots1 = c1_obj.get("slots", {})
                slots2 = c2_obj.get("slots", {})
                diff_summary = []
                for sk, sk_label in [("cold_heat_thirst", "寒熱渴飲"), ("secretion_excretion", "汗出二便"), ("subjective_sensation", "主觀感受")]:
                    v1 = "、".join(slots1.get(sk, [])[:2])
                    v2 = "、".join(slots2.get(sk, [])[:2])
                    if v1 and v2 and v1 != v2:
                        diff_summary.append(f"{sk_label}差異: [{c1['canonical_name']}: {v1}] vs [{c2['canonical_name']}: {v2}]")
                        
                discriminative_pivots.append({
                    "cluster_pair": f"{c1['canonical_name']} vs {c2['canonical_name']}",
                    "score_gap": round(c1["score"] - c2["score"], 2),
                    "contraindication_pivots": contra_pivots,
                    "slot_differences": diff_summary[:2]
                })

        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        
        return {
            "query": {
                "raw_terms": raw_terms,
                "normalized_terms": normalized_terms
            },
            "layer1_symptoms": sym_res,
            "total_candidates": len(cluster_scores),
            "top_k_results": top_clusters,
            "star_hubs_matched": star_hubs_matched,
            "hantang_matches": hantang_matches,
            "discriminative_pivots": discriminative_pivots,
            "elapsed_ms": round(elapsed_ms, 2)
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python nuwa_retriever.py <raw_query> [normalized_query]")
        print("Example: python nuwa_retriever.py '吹風頭痛流虛汗' '吹風 惡風 自汗'")
        sys.exit(0)
        
    raw_q = sys.argv[1]
    norm_q = sys.argv[2] if len(sys.argv) > 2 else ""
    
    retriever = NuwaRetriever()
    result = retriever.query(raw_q, norm_q)
    
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
