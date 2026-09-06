#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quiz DB Generator - Complying with spec_quiz_generate_v1_0.md
Generates 3,700 questions across 5 categories using AntiGravity / Gemini 3.7 Flash.
Features:
- Stream-append to quiz_stream.jsonl (Fault tolerance)
- Auto-resume from existing IDs
- Data cleansing & validation
- Parallel batch execution with backoff
- Aggregation to generated_quiz_all.json
"""

import os
import sys
import json
import re
import time
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

STREAM_FILE = "quiz_stream.jsonl"
OUTPUT_FILE = "generated_quiz_all.json"
MODEL_NAME = "gemini-3.7-flash-low"
MAX_WORKERS = 4

lock = threading.Lock()

# Banned keywords for cleansing
BANNED_WORDS = ["エラー", "Error", "error", "未定", "null", "undefined"]

VALID_CATEGORIES = {
    "小中復習",
    "高1基礎",
    "高1対大学受験",
    "難問ボーナス",
    "一般教養"
}

def clean_and_validate(q_dict, expected_category, expected_subcategory):
    """Validate and cleanse a question dictionary according to spec."""
    if not isinstance(q_dict, dict):
        return None
    
    # Required keys
    keys = ["id", "category", "subcategory", "source", "question", "answer", "answer_bool", "explanation"]
    for k in keys:
        if k not in q_dict or q_dict[k] is None:
            return None
    
    # Category / Subcategory normalization
    category = str(q_dict["category"]).strip()
    if category not in VALID_CATEGORIES:
        category = expected_category
    
    subcategory = str(q_dict["subcategory"]).strip() or expected_subcategory
    source = str(q_dict["source"]).strip() or "公式過去問・教科書基準"
    q_id = str(q_dict["id"]).strip()
    
    # Question text validation & normalization
    question = str(q_dict["question"]).strip()
    if len(question) < 8:
        return None
    
    # Must end with "である。"
    if not question.endswith("である。"):
        if question.endswith("である"):
            question += "。"
        elif question.endswith("。"):
            question = question[:-1] + "である。"
        else:
            question += "である。"
            
    # Answer validation
    ans = str(q_dict["answer"]).strip()
    if ans.lower() in ["yes", "true", "y", "はい"]:
        answer = "Yes"
        answer_bool = True
    elif ans.lower() in ["no", "false", "n", "いいえ"]:
        answer = "No"
        answer_bool = False
    else:
        # Fallback to answer_bool if valid
        if q_dict.get("answer_bool") is True:
            answer = "Yes"
            answer_bool = True
        elif q_dict.get("answer_bool") is False:
            answer = "No"
            answer_bool = False
        else:
            return None
            
    # Explanation validation
    explanation = str(q_dict["explanation"]).strip()
    if len(explanation) < 10:
        return None
        
    # Check banned words
    full_text = f"{question} {explanation} {source}"
    for w in BANNED_WORDS:
        if w in full_text:
            return None
            
    return {
        "id": q_id,
        "category": category,
        "subcategory": subcategory,
        "source": source,
        "question": question,
        "answer": answer,
        "answer_bool": answer_bool,
        "explanation": explanation
    }

def append_to_stream(items):
    """Thread-safe append items to quiz_stream.jsonl."""
    with lock:
        with open(STREAM_FILE, "a", encoding="utf-8") as f:
            for item in items:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
            f.flush()

def load_existing_ids():
    """Load already generated IDs from quiz_stream.jsonl."""
    if not os.path.exists(STREAM_FILE):
        return set()
    existing_ids = set()
    with open(STREAM_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                if "id" in data:
                    existing_ids.add(data["id"])
            except Exception:
                continue
    return existing_ids

def run_prompt_with_retry(prompt, retries=3):
    """Execute agy command with retry and timeout."""
    for attempt in range(retries):
        try:
            cmd = ["agy", "-p", prompt, "--model", MODEL_NAME]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if res.returncode != 0:
                time.sleep(2 * (attempt + 1))
                continue
            out = res.stdout.strip()
            
            # Extract JSON array
            m = re.search(r'\[\s*\{.*\}\s*\]', out, re.DOTALL)
            if m:
                json_str = m.group(0)
                # Remove trailing commas
                json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
                data = json.loads(json_str)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as e:
            time.sleep(2 * (attempt + 1))
    return None

def build_batches():
    """Build the batch definitions for all 3,700 questions."""
    batches = []

    # -------------------------------------------------------------
    # 1. 小中復習（合計900問）
    # -------------------------------------------------------------
    # 算数 200問 (8 x 25)
    for i in range(8):
        batches.append({
            "category": "小中復習",
            "subcategory": "算数",
            "prefix": "SC-MATH-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"小学校・中学校算数（割合・速さ・図形・分数・素数・規則性・ケアレスミス誘発引っかけ）バッチ {i+1}/8",
            "guideline": "瞬発力で解けるが、定義の勘違いやケアレスミスを誘発しやすい引っかけ良問。正方形とひし形、0の定義、素数の定義、平均、比、内角の和など。YesとNoはおよそ半々に。"
        })

    # 理科 200問 (8 x 25)
    for i in range(8):
        batches.append({
            "category": "小中復習",
            "subcategory": "理科",
            "prefix": "SC-SCI-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"小中学校理科（物理・化学・生物・地学・実験器具・天体・状態変化）バッチ {i+1}/8",
            "guideline": "光の反射・屈折、音の速さ、植物の光合成・呼吸、地震のP波S波、酸化・還元、水溶液の液性など。直感で間違えやすい引っかけ良問。YesとNoはおよそ半々に。"
        })

    # 社会 200問 (8 x 25)
    for i in range(8):
        batches.append({
            "category": "小中復習",
            "subcategory": "社会",
            "prefix": "SC-SOC-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"小中学校社会（地理・歴史・公民・憲法・三権分立）バッチ {i+1}/8",
            "guideline": "日本地理（気候区分・特産品）、世界地理、歴史の重要年代・人物・事件、憲法条文、三権分立の仕組みなど。勘違いしやすい引っかけ良問。YesとNoはおよそ半々に。"
        })

    # 国語 150問 (6 x 25)
    for i in range(6):
        batches.append({
            "category": "小中復習",
            "subcategory": "国語",
            "prefix": "SC-JPN-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"小中学校国語（同音異義語・慣用句・ことわざ・四字熟語・文法・敬語）バッチ {i+1}/6",
            "guideline": "「情けは人のためならず」の正しい意味、敬語（尊敬語・謙譲語）、品詞分類、故事成語、漢字の読み分けなど。YesとNoはおよそ半々に。"
        })

    # 英語 150問 (6 x 25)
    for i in range(6):
        batches.append({
            "category": "小中復習",
            "subcategory": "英語",
            "prefix": "SC-ENG-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"中学英語（基本文法・前置詞・不規則動詞過去形・三単現・疑問詞・重要熟語）バッチ {i+1}/6",
            "guideline": "前置詞（at, in, on）、不規則変化動詞、助動詞の使い方、間接疑問文、不定詞・動名詞など。ケアレスミスしやすい文法判定。YesとNoはおよそ半々に。"
        })

    # -------------------------------------------------------------
    # 2. 高1基礎（合計1,000問）
    # -------------------------------------------------------------
    # 大学入試頻出英単語 500問 (20 x 25)
    word_levels = [
        "最頻出動詞（provide, consider, acquire, regard 等）",
        "最頻出名詞（evidence, feature, perspective, concept 等）",
        "最頻出形容詞・副詞（crucial, obvious, primary, essential 等）",
        "多義語（mean, state, book, present, right 等）",
        "抽象概念・論理語（consequence, significance, hypothesis 等）",
        "社会・経済・法律語彙（legislation, economy, consumer, claim 等）",
        "科学・自然・技術語彙（substance, evolution, environment, phenomenon 等）",
        "心理・感情・知覚語彙（perceive, anxiety, conscious, intuition 等）",
        "学術・論説頻出語彙（implication, illustrate, demonstrate, interpret 等）",
        "紛らわしい類義語・反意語・接頭辞派生語"
    ]
    for i in range(20):
        theme = word_levels[i % len(word_levels)]
        batches.append({
            "category": "高1基礎",
            "subcategory": "英単語",
            "prefix": "H1-ENG-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"ターゲット1900・シス単準拠 大学入試最重要英単語（{theme}）バッチ {i+1}/20",
            "guideline": "形式は必ず『英単語「xxx」の主要な意味は「〜」である。』とする。正しい意味(Yes)と、別の紛らわしい単語の意味や誤訳(No)をおよそ半々で作問。sourceは「ターゲット1900 / システム英単語」等。"
        })

    # 情報I 200問 (8 x 25)
    info_topics = [
        "プログラミング概念・アルゴリズム（変数・ループ・条件分岐・配列・計算量）",
        "基数変換・2進数・補数・論理回路（AND/OR/XOR・真理値表）",
        "デジタル化・データ表現（標本化・量子化・符号化・画像解像度・音声圧縮）",
        "ネットワーク基礎・プロトコル（TCP/IP・DNS・IPアドレス・ルーティング）",
        "情報セキュリティ（暗号化・公開鍵・共通鍵・認証・マルウェア・サイバー攻撃）",
        "知的財産権・法制度（著作権法・個人情報保護法・OSS・クリエイティブコモンズ）",
        "情報モラル・メディアリテラシー・情報社会の特質",
        "データベース・モデル化・シミュレーション・情報デザイン"
    ]
    for i in range(8):
        batches.append({
            "category": "高1基礎",
            "subcategory": "情報I",
            "prefix": "H1-INFO-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"高校情報I（{info_topics[i]}）バッチ {i+1}/8",
            "guideline": "新課程情報Iの必修教科書基準。厳密な定義や計算・プロトコルの知識を問う良問。YesとNoはおよそ半々に。"
        })

    # その他主要教科 300問
    # 数学I・A: 80問 (4 x 20)
    for i in range(4):
        batches.append({
            "category": "高1基礎",
            "subcategory": "数学I・A",
            "prefix": "H1-MATH-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"高校数学I・A（数と式・集合と命題・2次関数・図形と計量・データの分析・場合の数・確率）バッチ {i+1}/4",
            "guideline": "必要十分条件、2次関数の軸と頂点、判別式、余弦定理、四分位数・箱ひげ図、独立な試行など。定義や定理の正確な理解を問う。YesとNoはおよそ半々に。"
        })

    # 歴史総合: 50問 (2 x 25)
    for i in range(2):
        batches.append({
            "category": "高1基礎",
            "subcategory": "歴史総合",
            "prefix": "H1-HIST-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"高校歴史総合（近代化・大衆化・グローバル化、日清日露、世界大戦、冷戦）バッチ {i+1}/2",
            "guideline": "新課程歴史総合。日本と世界の近現代史の連関、条約、国際連盟・国際連合、冷戦構造など。YesとNoはおよそ半々に。"
        })

    # 地理総合: 40問 (2 x 20)
    for i in range(2):
        batches.append({
            "category": "高1基礎",
            "subcategory": "地理総合",
            "prefix": "H1-GEO-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"高校地理総合（地図・GIS・防災・気候区分・人口・産業・地球的課題）バッチ {i+1}/2",
            "guideline": "新課程地理総合。ケッペンの気候区分、ハザードマップ・防災GIS、資源エネルギー、食料問題など。YesとNoはおよそ半々に。"
        })

    # 公共: 50問 (2 x 25)
    for i in range(2):
        batches.append({
            "category": "高1基礎",
            "subcategory": "公共",
            "prefix": "H1-PUB-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"高校公共（人間と倫理・日本国憲法・統治機構・市場経済・社会保障）バッチ {i+1}/2",
            "guideline": "新課程公共。基本的人権、統治機構、司法制度、金融政策・財政政策、社会保障、青年期と倫理。YesとNoはおよそ半々に。"
        })

    # 理科基礎: 50問 (2 x 25)
    for i in range(2):
        batches.append({
            "category": "高1基礎",
            "subcategory": "理科基礎",
            "prefix": "H1-SCI-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"高校理科基礎（物理基礎・化学基礎・生物基礎・地学基礎の横断重要事項）バッチ {i+1}/2",
            "guideline": "エネルギー保存、モル計算・中和反応、DNA・セントラルドグマ、恒星と太陽系、地球の構造。YesとNoはおよそ半々に。"
        })

    # 国語: 30問 (1 x 30)
    batches.append({
        "category": "高1基礎",
        "subcategory": "国語",
        "prefix": "H1-JPN-",
        "start": 1,
        "count": 30,
        "topic": "高校現代の国語・言語文化（重要古文単語・漢文句法・論理的文章の読解ルール）",
        "guideline": "重要古文単語の意味（あわれなり、をかし等）、係り結びの法則、漢文の再読文字・反語・否定句法など。YesとNoはおよそ半々に。"
    })

    # -------------------------------------------------------------
    # 3. 高1対大学受験（合計500問）
    # -------------------------------------------------------------
    # 英語 80問 (4 x 20)
    for i in range(4):
        batches.append({
            "category": "高1対大学受験",
            "subcategory": "英語",
            "prefix": "COMM-ENG-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"共通テスト英語リーディング過去問・試作問題改題（事実と意見の識別・図表読み取り・パラグラフ論理）バッチ {i+1}/4",
            "guideline": "問題文冒頭に【共通テスト 20xx年 改題】を必ず付与。事実(Fact)と意見(Opinion)の判別、プレゼン資料やWebサイトの読み取りに関する命題。YesとNoはおよそ半々に。"
        })

    # 数学I・A 80問 (4 x 20)
    for i in range(4):
        batches.append({
            "category": "高1対大学受験",
            "subcategory": "数学I・A",
            "prefix": "COMM-MATH-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"共通テスト数学I・A本試・追試・試作問題改題（日常事象の数理モデル化・データの分析・幾何定理）バッチ {i+1}/4",
            "guideline": "問題文冒頭に【共通テスト 20xx年 改題】を必ず付与。日常の会話や課題解決をテーマにした問題、外心・内心・方べきの定理、分散や相関係数の性質など。YesとNoはおよそ半々に。"
        })

    # 情報I 60問 (3 x 20)
    for i in range(3):
        batches.append({
            "category": "高1対大学受験",
            "subcategory": "情報I",
            "prefix": "COMM-INFO-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"共通テスト情報I本試・試作問題改題（DNCLプログラム・擬似言語トレース・データ分析・暗号）バッチ {i+1}/3",
            "guideline": "問題文冒頭に【共通テスト 20xx年 改題】を必ず付与。擬似言語の実行結果、パリティビット・ハミング符号、ネットワーク遅延計算、個人情報保護の事例判定など。YesとNoはおよそ半々に。"
        })

    # 国語 60問 (3 x 20)
    for i in range(3):
        batches.append({
            "category": "高1対大学受験",
            "subcategory": "国語",
            "prefix": "COMM-JPN-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"共通テスト国語本試・追試改題（近代論説文・実用的文章・古文・漢文）バッチ {i+1}/3",
            "guideline": "問題文冒頭に【共通テスト 20xx年 改題】を必ず付与。複数資料の統合、図表と本文の整合性、古文の主語判別、漢文の故事成語の教訓など。YesとNoはおよそ半々に。"
        })

    # 理科 80問 (4 x 20)
    for i in range(4):
        batches.append({
            "category": "高1対大学受験",
            "subcategory": "理科",
            "prefix": "COMM-SCI-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"共通テスト理科基礎・本試験改題（物理基礎・化学基礎・生物基礎・地学基礎の思考実験）バッチ {i+1}/4",
            "guideline": "問題文冒頭に【共通テスト 20xx年 改題】を必ず付与。実験グラフの解釈、仮説検証、光電効果・エネルギー変換、生体膜輸送、プレートテクトニクスなど。YesとNoはおよそ半々に。"
        })

    # 地歴公民 140問 (7 x 20)
    for i in range(7):
        batches.append({
            "category": "高1対大学受験",
            "subcategory": "地歴公民",
            "prefix": "COMM-SOC-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"共通テスト歴史総合・世界史・日本史・地理総合・公共・政経本試改題バッチ {i+1}/7",
            "guideline": "問題文冒頭に【共通テスト 20xx年 改題】を必ず付与。統計資料や歴史史料の読み取り、国際条約、憲法判例、為替レートと貿易収支など。YesとNoはおよそ半々に。"
        })

    # -------------------------------------------------------------
    # 4. 難問ボーナス（合計200問）
    # -------------------------------------------------------------
    # 数学 50問 (2 x 25)
    for i in range(2):
        batches.append({
            "category": "難問ボーナス",
            "subcategory": "数学",
            "prefix": "HARD-MATH-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"東京大学・京都大学・東京工業大学の数学過去問改題（整数論・幾何・極限・確率漸化式）バッチ {i+1}/2",
            "guideline": "問題文冒頭に【東京大学 20xx年 改題】や【京都大学 20xx年 改題】等を必ず付与。円周率3.05証明など著名な難問改題を含む深い洞察を問う問題。YesとNoはおよそ半々に。"
        })

    # 英語 40問 (2 x 20)
    for i in range(2):
        batches.append({
            "category": "難問ボーナス",
            "subcategory": "英語",
            "prefix": "HARD-ENG-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"東京大学・早稲田大学・慶應義塾大学の英語過去問改題（精緻な英文解釈・語法・論理構造）バッチ {i+1}/2",
            "guideline": "問題文冒頭に【東京大学 20xx年 改題】や【早稲田大学 20xx年 改題】等を必ず付与。倒置・省略・多義語の深い意味、高度な学術エッセイの趣旨判定。YesとNoはおよそ半々に。"
        })

    # 国語 30問 (1 x 30)
    batches.append({
        "category": "難問ボーナス",
        "subcategory": "国語",
        "prefix": "HARD-JPN-",
        "start": 1,
        "count": 30,
        "topic": "東京大学・京都大学・一橋大学の国語（現代文・古文・漢文）過去問改題",
        "guideline": "問題文冒頭に【東京大学 20xx年 改題】や【京都大学 20xx年 改題】等を必ず付与。東大の哲学・文芸批評の論理展開、難関古文の敬語による主語同定、漢文の深層読解。YesとNoはおよそ半々に。"
    })

    # 物理・化学 40問 (2 x 20)
    for i in range(2):
        batches.append({
            "category": "難問ボーナス",
            "subcategory": "理科",
            "prefix": "HARD-SCI-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"東大・京大・東工大・早慶の物理・化学過去問改題（微小振動・非慣性系・化学平衡・錯イオン・熱力学）バッチ {i+1}/2",
            "guideline": "問題文冒頭に【東京大学 20xx年 改題】や【東京工業大学 20xx年 改題】等を必ず付与。物理・化学の本質的な物理現象や微視的解釈を問う。YesとNoはおよそ半々に。"
        })

    # 地歴公民 40問 (2 x 20)
    for i in range(2):
        batches.append({
            "category": "難問ボーナス",
            "subcategory": "地歴公民",
            "prefix": "HARD-SOC-",
            "start": i * 20 + 1,
            "count": 20,
            "topic": f"東大・京大・一橋・駿台全国模試の歴史・地理・政経改題（論述のエッセンスを命題化）バッチ {i+1}/2",
            "guideline": "問題文冒頭に【東京大学 20xx年 改題】や【一橋大学 20xx年 改題】等を必ず付与。歴史の因果関係、銀の流通と世界経済、ブレトンウッズ体制の崩壊の背景など。YesとNoはおよそ半々に。"
        })

    # -------------------------------------------------------------
    # 5. 一般教養・常識（合計1,100問）
    # -------------------------------------------------------------
    # 政治・法律 200問 (8 x 25)
    for i in range(8):
        batches.append({
            "category": "一般教養",
            "subcategory": "政治・法律",
            "prefix": "GEN-POL-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"政治・行政・法制度・憲法判例・選挙制度（雑学排除・大人の常識）バッチ {i+1}/8",
            "guideline": "衆議院の優越、内閣不信任決議、裁判員制度、民法（契約・不法行為・成年年齢）、行政不服審査など。YesとNoはおよそ半々に。"
        })

    # 経済・金融 200問 (8 x 25)
    for i in range(8):
        batches.append({
            "category": "一般教養",
            "subcategory": "経済・金融",
            "prefix": "GEN-ECO-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"経済・金融・市場・財政・税制・株式（雑学排除・ビジネス常識）バッチ {i+1}/8",
            "guideline": "日本銀行の金融政策決定会合・長短金利操作、インフレとデフレ、GDPとGNI、NISA・iDeCo、消費税の軽減税率など。YesとNoはおよそ半々に。"
        })

    # 国際情勢 150問 (6 x 25)
    for i in range(6):
        batches.append({
            "category": "一般教養",
            "subcategory": "国際情勢",
            "prefix": "GEN-INT-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"国際情勢・地政学・安全保障・国連・地域統合（EU・ASEAN・NATO）バッチ {i+1}/6",
            "guideline": "国連安全保障理事会の拒否権、NATO加盟国、日米安全保障条約、米中関係、グローバルサウス、ブレグジットなど。YesとNoはおよそ半々に。"
        })

    # IT・インフラ 200問 (8 x 25)
    for i in range(8):
        batches.append({
            "category": "一般教養",
            "subcategory": "IT・インフラ",
            "prefix": "GEN-IT-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"ITインフラ・クラウド・セキュリティ・DX・AI倫理（雑学排除・ビジネス実務常識）バッチ {i+1}/8",
            "guideline": "クラウド（IaaS/PaaS/SaaS）、VPN、二要素認証、フィッシング詐欺、生成AIと著作権、DNSサーバー、ゼロトラストなど。YesとNoはおよそ半々に。"
        })

    # 現代史 150問 (6 x 25)
    for i in range(6):
        batches.append({
            "category": "一般教養",
            "subcategory": "現代史",
            "prefix": "GEN-HIST-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"日本・世界の現代史（戦後復興・冷戦・オイルショック・バブル崩壊・東日本大震災・現代）バッチ {i+1}/6",
            "guideline": "サンフランシスコ平和条約、安保闘争、プラザ合意、ソ連崩壊、自衛隊の海外派遣、リーマンショックなどの重要現代史。YesとNoはおよそ半々に。"
        })

    # 地理・環境 100問 (4 x 25)
    for i in range(4):
        batches.append({
            "category": "一般教養",
            "subcategory": "地理・環境",
            "prefix": "GEN-GEO-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"大人の地理常識・気候変動・SDGs・環境問題・エネルギー問題バッチ {i+1}/4",
            "guideline": "パリ協定、再生可能エネルギー、カーボンニュートラル、世界の主要運河・海峡、日本の都道府県の産業特徴など。YesとNoはおよそ半々に。"
        })

    # ビジネス常識 100問 (4 x 25)
    for i in range(4):
        batches.append({
            "category": "一般教養",
            "subcategory": "ビジネス常識",
            "prefix": "GEN-BIZ-",
            "start": i * 25 + 1,
            "count": 25,
            "topic": f"ビジネスマナー・労働基準法・契約常識・コンプライアンス（社会人の必須知識）バッチ {i+1}/4",
            "guideline": "有給休暇の付与要件、みなし残業、秘密保持契約（NDA）、クーリングオフ制度、インサイダー取引規制など。YesとNoはおよそ半々に。"
        })

    return batches

def process_batch(batch, existing_ids):
    """Generate and process a single batch."""
    prefix = batch["prefix"]
    start = batch["start"]
    count = batch["count"]
    expected_category = batch["category"]
    expected_subcategory = batch["subcategory"]
    
    # Check if all IDs in this batch already exist
    needed_indices = [i for i in range(start, start + count) if f"{prefix}{i:03d}" not in existing_ids]
    if not needed_indices:
        return 0, count  # 0 generated, count already done
        
    prompt = f"""あなたは大学入試・高校教育・教養クイズの超一流作問エキスパートです。
以下の仕様に厳密に従い、答えが「Yes」または「No」に一意に定まる2択命題クイズを【{len(needed_indices)}問】生成し、JSON配列形式のみを出力してください。
余計な解説文、挨拶、```json などのコードブロックマーカーは一切含めず、純粋なJSON配列（[ で始まり ] で終わる）のみを出力してください。

【テーマ】
- カテゴリ: {expected_category}
- サブカテゴリ: {expected_subcategory}
- 出題詳細: {batch['topic']}
- 作問ガイドライン: {batch['guideline']}

【割り当てID一覧】
{', '.join([f'{prefix}{i:03d}' for i in needed_indices])}

【厳守要件】
1. 各問の id は上記「割り当てID一覧」の値を上から順番に必ず使用すること。
2. question は必ず「〜である。」で終わる2択命題文にすること。曖昧さや例外の解釈によるブレを完全に排除し、正誤が一意に定まること。
3. answer は "Yes" または "No" とすること。
4. answer_bool は true または false とすること（answerと完全一致）。
5. 全{len(needed_indices)}問の中で、YesとNoの比率はおよそ半々（50%程度）にバランスさせること。
6. explanation は2〜3行以内（50〜150文字程度）の論理的で明快な解説とすること。なぜYesなのか、または何が誤りで正しくは何なのかを明確に述べること。
7. source は公的な教科書、学習指導要領、大学入試過去問名（例: 共通テスト 2024年 本試験、東京大学 2022年 前期、ターゲット1900 等）を明記すること。
8. データクレンジング要件: 出力全体に「エラー」「Error」「未定」等の文字列、およびnull値は一切含めないこと。

【JSONスキーマ】
[
  {{
    "id": "{prefix}{needed_indices[0]:03d}",
    "category": "{expected_category}",
    "subcategory": "{expected_subcategory}",
    "source": "出典元情報",
    "question": "〇〇は××である。",
    "answer": "Yes",
    "answer_bool": true,
    "explanation": "解説文。"
  }}
]
"""

    raw_items = run_prompt_with_retry(prompt)
    if not raw_items:
        return 0, 0
        
    valid_items = []
    for idx, raw_q in zip(needed_indices, raw_items):
        # Force exact assigned ID
        if isinstance(raw_q, dict):
            raw_q["id"] = f"{prefix}{idx:03d}"
            cleaned = clean_and_validate(raw_q, expected_category, expected_subcategory)
            if cleaned:
                valid_items.append(cleaned)
                
    if valid_items:
        append_to_stream(valid_items)
        
    return len(valid_items), count

def aggregate_results():
    """Aggregate quiz_stream.jsonl into generated_quiz_all.json and show stats."""
    if not os.path.exists(STREAM_FILE):
        print(f"Error: {STREAM_FILE} does not exist.")
        return 0
        
    items_by_id = {}
    with open(STREAM_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                if "id" in data:
                    items_by_id[data["id"]] = data
            except Exception:
                continue
                
    all_items = list(items_by_id.values())
    
    # Save to generated_quiz_all.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)
        
    # Generate statistics
    category_counts = {}
    subcategory_counts = {}
    yes_count = 0
    no_count = 0
    
    for item in all_items:
        cat = item.get("category", "不明")
        subcat = item.get("subcategory", "不明")
        category_counts[cat] = category_counts.get(cat, 0) + 1
        key = f"{cat} > {subcat}"
        subcategory_counts[key] = subcategory_counts.get(key, 0) + 1
        if item.get("answer_bool") is True:
            yes_count += 1
        else:
            no_count += 1
            
    print("\n========================================================")
    print(f"🎉 クイズDB構築完了! 総問題数: {len(all_items)}問")
    if all_items:
        print(f"   Yes数: {yes_count} ({yes_count/len(all_items)*100:.1f}%) / No数: {no_count} ({no_count/len(all_items)*100:.1f}%)")
    print("--------------------------------------------------------")
    print("【カテゴリ別集計】")
    for cat, cnt in sorted(category_counts.items()):
        print(f" - {cat}: {cnt}問")
    print("--------------------------------------------------------")
    print("【サブカテゴリ別集計】")
    for subcat, cnt in sorted(subcategory_counts.items()):
        print(f" - {subcat}: {cnt}問")
    print("========================================================\n")
    return len(all_items)

def main():
    import sys
    batches = build_batches()
    if "--reverse" in sys.argv:
        batches.reverse()
        print("🔄 逆順処理モードで実行します (末尾バッチから並列生成)")
        
    total_planned = sum(b["count"] for b in batches)
    print(f"🚀 クイズ問題一括生成タスク開始")
    print(f"   計画総問題数: {total_planned}問 / バッチ数: {len(batches)}")
    
    existing_ids = load_existing_ids()
    print(f"   既存生成済みID数: {len(existing_ids)}問 (自動レジューム有効)")
    
    completed_batches = 0
    generated_in_this_run = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_batch = {executor.submit(process_batch, b, existing_ids): b for b in batches}
        for future in as_completed(future_to_batch):
            b = future_to_batch[future]
            completed_batches += 1
            try:
                gen_cnt, planned_cnt = future.result()
                generated_in_this_run += gen_cnt
                print(f"[{completed_batches}/{len(batches)}] {b['category']} > {b['subcategory']} ({b['prefix']}{b['start']:03d}〜) : {gen_cnt}/{planned_cnt}問 追加 (進捗: {completed_batches/len(batches)*100:.1f}%)")
            except Exception as exc:
                print(f"[{completed_batches}/{len(batches)}] エラー発生: {exc}")
                
    # Check for missing batches and retry
    for round_num in range(1, 4):
        existing_ids = load_existing_ids()
        missing_batches = []
        for b in batches:
            needed = [i for i in range(b["start"], b["start"] + b["count"]) if f"{b['prefix']}{i:03d}" not in existing_ids]
            if needed:
                missing_batches.append(b)
        if not missing_batches:
            print("✅ 全計画問題（3,700問）の生成が完了しました！")
            break
        print(f"🔄 未完了のバッチ {len(missing_batches)} 件を再試行します (Round {round_num})...")
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_batch = {executor.submit(process_batch, b, existing_ids): b for b in missing_batches}
            for future in as_completed(future_to_batch):
                b = future_to_batch[future]
                try:
                    gen_cnt, planned_cnt = future.result()
                    print(f"  [再試行] {b['prefix']} : {gen_cnt}問 追加")
                except Exception as exc:
                    print(f"  [再試行エラー]: {exc}")

    # Final aggregation
    total_count = aggregate_results()
    print(f"出力ファイル: {OUTPUT_FILE} ({total_count}問)")

if __name__ == "__main__":
    main()
