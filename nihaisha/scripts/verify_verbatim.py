#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_verbatim.py - 確定性原文切片特徵錨點驗真腳本
嚴格校驗 thesaurus_layman_to_tcm.json 中的所有 verbatim_anchor 必須 100% 存在於切片檔案中。
拒絕空跑，要求至少通過 N 個有效驗證錨點，否則判定失敗。
"""

import os
import sys
import json
import re
import io

# Force UTF-8 on Windows console
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def normalize_text(text: str) -> str:
    """正規化文字：壓縮空白、換行與全半形標點，避免排版微異導致誤判"""
    text = re.sub(r'\s+', ' ', text)
    # 正規化常見中英文引號
    text = text.replace('“', '"').replace('”', '"').replace('「', '"').replace('」', '"')
    text = text.replace('‘', "'").replace('’', "'").replace('『', "'").replace('』', "'")
    return text.strip()

def verify_anchors(corpus_dir: str, clusters_json_path: str, min_required_anchors: int = 20) -> bool:
    if not os.path.exists(clusters_json_path):
        print(f"[FAIL] 辭庫檔案不存在: {clusters_json_path}")
        return False

    with open(clusters_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 同時支援 clusters 與 entries 鍵，防止架構版本落差
    clusters = data.get('clusters', []) or data.get('entries', [])
    if not clusters:
        print("[FAIL] 辭庫中未找到任何 clusters 或 entries 條目！")
        return False

    total_anchors = 0
    passed_anchors = 0
    errors = []

    for cluster in clusters:
        cluster_id = cluster.get('cluster_id') or cluster.get('id', 'UNKNOWN_ID')
        chunk_refs = cluster.get('chunk_refs', [])

        for ref in chunk_refs:
            # 支援字典物件或純字串
            if isinstance(ref, dict):
                rel_path = ref.get('chunk_path') or ref.get('file_path', '')
                anchor = (ref.get('anchor_snippet') or ref.get('verbatim_anchor') or '').strip()
            else:
                rel_path = str(ref)
                anchor = cluster.get('ni_verbatim_quote', '').strip()[:20]

            if not anchor:
                continue

            total_anchors += 1
            full_path = os.path.join(corpus_dir, rel_path.replace('/', os.sep))

            if not os.path.exists(full_path):
                errors.append(f"[{cluster_id}] 切片檔案不存在: {rel_path}")
                continue

            try:
                with open(full_path, 'r', encoding='utf-8') as cf:
                    file_content = cf.read()
            except Exception as e:
                errors.append(f"[{cluster_id}] 讀取檔案失敗 {rel_path}: {e}")
                continue

            norm_content = normalize_text(file_content)
            norm_anchor = normalize_text(anchor)

            if norm_anchor in norm_content:
                passed_anchors += 1
            else:
                # 截取前 25 字元顯示錯誤
                errors.append(f"[{cluster_id}] 錨點在檔案 {rel_path} 中找不到: '{anchor[:25]}...'")

    print(f"=== 原文切片特徵錨點驗真報告 ===")
    print(f"總檢驗錨點數 (Total Anchors Checked): {total_anchors}")
    print(f"通過驗證數 (Passed): {passed_anchors}")
    print(f"失敗數 (Failed): {len(errors)}")

    if total_anchors < min_required_anchors:
        print(f"[FAIL] 檢驗錨點數 ({total_anchors}) 低於最低強制門檻 ({min_required_anchors})，拒絕假通過！")
        return False

    if errors:
        print("\n[!] 失敗清單（前 10 筆）：")
        for err in errors[:10]:
            print("  [FAIL]", err)
        return False

    print("\n[PASS] 所有特徵錨點 100% 存在於真實 Markdown 切片中，零幻覺驗真通過！")
    return True

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # 優先檢查 data/00_全域方證與條文速查地圖/thesaurus_layman_to_tcm.json
    clusters_path = os.path.join(base_dir, 'data', '00_全域方證與條文速查地圖', 'thesaurus_layman_to_tcm.json')
    if not os.path.exists(clusters_path):
        clusters_path = os.path.join(base_dir, '00_全域方證與條文速查地圖', 'thesaurus_layman_to_tcm.json')
    if not os.path.exists(clusters_path):
        clusters_path = os.path.join(base_dir, 'thesaurus_layman_to_tcm.json')
    
    # 支援透過命令列指定路徑
    if len(sys.argv) > 1:
        clusters_path = sys.argv[1]
    if len(sys.argv) > 2:
        base_dir = sys.argv[2]

    min_anchors = 20 if 'thesaurus' in clusters_path else 1
    success = verify_anchors(base_dir, clusters_path, min_required_anchors=min_anchors)
    sys.exit(0 if success else 1)
