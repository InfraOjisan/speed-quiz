#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quiz Aggregation & Cleansing Script
Reads quiz_stream.jsonl, cleanses, validates, normalizes predicate endings,
deduplicates by ID, outputs generated_quiz_all.json, and prints breakdown statistics.
"""

import os
import json
import re

STREAM_FILE = "quiz_stream.jsonl"
OUTPUT_FILE = "generated_quiz_all.json"
BANNED_WORDS = ["エラー", "Error", "error", "未定", "null", "undefined"]

def normalize_question(q_str):
    q = q_str.strip().rstrip("。")
    # Fix repeated である
    while q.endswith("であるである"):
        q = q[:-len("である")]
    # Fix awkward verb/adjective + である
    if q.endswith("るである") or q.endswith("いである") or q.endswith("たである"):
        q = q[:-len("である")] + "ものである"
    elif q.endswith("だ"):
        q = q[:-1] + "である"
    elif not q.endswith("である"):
        if q.endswith("る") or q.endswith("い") or q.endswith("た"):
            q = q + "ものである"
        else:
            q = q + "である"
    return q + "。"

def main():
    if not os.path.exists(STREAM_FILE):
        print(f"Error: {STREAM_FILE} does not exist.")
        return

    items_by_id = {}
    total_lines = 0

    with open(STREAM_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            total_lines += 1
            try:
                data = json.loads(line)
            except Exception:
                continue

            qid = data.get("id")
            if not qid:
                continue

            # Data cleansing check
            full_text = f"{data.get('question','')} {data.get('explanation','')} {data.get('source','')}"
            if any(w in full_text for w in BANNED_WORDS):
                continue

            # Normalize question
            data["question"] = normalize_question(data["question"])

            # Normalize answer
            ans = str(data.get("answer", "")).strip().lower()
            if ans in ["yes", "true", "y", "はい"] or data.get("answer_bool") is True:
                data["answer"] = "Yes"
                data["answer_bool"] = True
            else:
                data["answer"] = "No"
                data["answer_bool"] = False

            # Ensure non-empty fields
            data["source"] = str(data.get("source", "")).strip() or "公式過去問・教科書基準"
            data["explanation"] = str(data.get("explanation", "")).strip()

            items_by_id[qid] = data

    print(f"Read {total_lines} lines from stream. Unique clean questions: {len(items_by_id)}")

    # Sort order
    category_order = {
        "小中復習": 1,
        "高1基礎": 2,
        "高1対大学受験": 3,
        "難問ボーナス": 4,
        "一般教養": 5
    }

    all_items = list(items_by_id.values())
    all_items.sort(key=lambda x: (category_order.get(x.get("category", ""), 99), x.get("id", "")))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)

    # Size check
    file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)

    # Breakdown stats
    cat_stats = {}
    subcat_stats = {}
    yes_cnt = 0
    no_cnt = 0

    for item in all_items:
        c = item.get("category", "不明")
        s = item.get("subcategory", "不明")
        cat_stats[c] = cat_stats.get(c, 0) + 1
        key = f"{c} > {s}"
        subcat_stats[key] = subcat_stats.get(key, 0) + 1
        if item.get("answer_bool"):
            yes_cnt += 1
        else:
            no_cnt += 1

    print("\n========================================================")
    print(f"🎉 クイズDB成果物集約完了: {OUTPUT_FILE}")
    print(f"   総問題数: {len(all_items)}問 (ファイルサイズ: {file_size_mb:.2f} MB)")
    print(f"   正答バランス: Yes {yes_cnt}問 ({yes_cnt/len(all_items)*100:.1f}%) / No {no_cnt}問 ({no_cnt/len(all_items)*100:.1f}%)")
    print("--------------------------------------------------------")
    print("【カテゴリ別集計】")
    for cat, cnt in sorted(cat_stats.items(), key=lambda x: category_order.get(x[0], 99)):
        print(f" - {cat}: {cnt}問")
    print("--------------------------------------------------------")
    print("【サブカテゴリ別集計】")
    for subcat, cnt in sorted(subcat_stats.items()):
        print(f" - {subcat}: {cnt}問")
    print("========================================================\n")

if __name__ == "__main__":
    main()
